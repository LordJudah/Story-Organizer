import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { batchProcess } from "./replit_integrations/batch";

// Integration imports
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Auth Integration
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // 2. Setup Other Integrations
  registerObjectStorageRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  // 3. Application Routes

  // === PROJECTS ===
  app.get(api.projects.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const projects = await storage.getProjects(userId);
    res.json(projects);
  });

  app.post(api.projects.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.projects.create.input.parse(req.body);
      const userId = req.user.claims.sub;
      const project = await storage.createProject({ ...input, userId });
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.projects.get.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.userId !== req.user.claims.sub) return res.status(401).json({ message: "Unauthorized" });

    // Fetch relations
    const mediaItems = await storage.getMediaItems(id);
    const scenes = await storage.getScenes(id);

    res.json({ ...project, mediaItems, scenes });
  });

  app.patch(api.projects.update.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.userId !== req.user.claims.sub) return res.status(401).json({ message: "Unauthorized" });

    const input = api.projects.update.input.parse(req.body);
    const updated = await storage.updateProject(id, input);
    res.json(updated);
  });

  app.delete(api.projects.delete.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.userId !== req.user.claims.sub) return res.status(401).json({ message: "Unauthorized" });

    await storage.deleteProject(id);
    res.status(204).send();
  });

  // === ANALYZE (AI) ===
  app.post(api.projects.analyze.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (project.userId !== req.user.claims.sub) return res.status(401).json({ message: "Unauthorized" });

    // Start background analysis
    // In a real app, this would be a proper background job.
    // Here we'll fire and forget (or do a small batch).
    
    const mediaItems = await storage.getMediaItems(id);
    
    if (mediaItems.length === 0) {
      return res.status(400).json({ message: "No media to analyze" });
    }

    // Update status
    await storage.updateProject(id, { status: "analyzing" });

    // Background processing
    (async () => {
      try {
        // 1. Analyze images
        await batchProcess(mediaItems, async (item) => {
          if (!item.url) return;
          
          try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o", // Multimodal model
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Describe this image in detail for a visual story. Focus on mood, lighting, and key subjects." },
                    { type: "image_url", image_url: { url: item.url } },
                  ],
                },
              ],
              max_tokens: 300,
            });

            const description = response.choices[0]?.message?.content || "";
            await storage.updateMediaItem(item.id, { description });
          } catch (e) {
            console.error(`Failed to analyze media ${item.id}`, e);
          }
        }, { concurrency: 3 });

        // 2. Generate Scenes (Sequencing)
        const analyzedMedia = await storage.getMediaItems(id);
        const prompt = project.prompt || "Create a cohesive story from these images.";
        
        const mediaContext = analyzedMedia.map(m => `ID: ${m.id}, Desc: ${m.description}`).join("\n");
        
        const sequenceResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "You are a professional video editor and storyteller. Organize the following media clips into a sequence of scenes based on the user's prompt. Return a JSON array of scenes." 
            },
            {
              role: "user",
              content: `User Prompt: ${prompt}\n\nMedia:\n${mediaContext}\n\nGenerate a JSON response with this structure:
              {
                "scenes": [
                  {
                    "title": "Scene Title",
                    "narration": "Voiceover text...",
                    "mediaIds": [id1, id2]
                  }
                ]
              }`
            }
          ],
          response_format: { type: "json_object" },
        });

        const sequenceData = JSON.parse(sequenceResponse.choices[0]?.message?.content || "{}");
        
        if (sequenceData.scenes) {
          // Clear existing scenes? Maybe. For now, just append.
          for (const [index, scene] of sequenceData.scenes.entries()) {
            const newScene = await storage.createScene({
              projectId: id,
              title: scene.title,
              narrationText: scene.narration,
              orderIndex: index,
            });
            
            // Assign media to scene
            // Note: Our schema has mediaItems.sceneId. So we update media items.
            if (scene.mediaIds && Array.isArray(scene.mediaIds)) {
              for (const mediaId of scene.mediaIds) {
                await storage.updateMediaItem(mediaId, { sceneId: newScene.id });
              }
            }
          }
        }

        await storage.updateProject(id, { status: "ready" });

      } catch (error) {
        console.error("Analysis failed", error);
        await storage.updateProject(id, { status: "failed" });
      }
    })();

    res.status(202).json({ message: "Analysis started" });
  });

  // === MEDIA ===
  app.get(api.media.list.path, isAuthenticated, async (req: any, res) => {
    const projectId = parseInt(req.params.projectId);
    // Verify ownership
    const project = await storage.getProject(projectId);
    if (!project || project.userId !== req.user.claims.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const items = await storage.getMediaItems(projectId);
    res.json(items);
  });

  app.post(api.media.create.path, isAuthenticated, async (req: any, res) => {
    const projectId = parseInt(req.params.projectId);
    // Verify ownership
    const project = await storage.getProject(projectId);
    if (!project || project.userId !== req.user.claims.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const input = api.media.create.input.parse(req.body);
      const item = await storage.createMediaItem({ ...input, projectId });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // === SCENES ===
  app.get(api.scenes.list.path, isAuthenticated, async (req: any, res) => {
    const projectId = parseInt(req.params.projectId);
    const scenes = await storage.getScenes(projectId);
    res.json(scenes);
  });

  // === EXPORTS ===
  app.post(api.exports.create.path, isAuthenticated, async (req: any, res) => {
    const projectId = parseInt(req.params.projectId);
    const input = api.exports.create.input.parse(req.body);
    
    // In a real app, this would trigger a job.
    // For now, create a mock export record.
    const exportItem = await storage.createExport({
      ...input,
      projectId,
      status: "processing"
    });
    
    // Simulate completion
    setTimeout(async () => {
      await db.update(schema.exports)
        .set({ status: "complete", url: "https://example.com/download.zip" })
        .where(eq(schema.exports.id, exportItem.id));
    }, 5000);

    res.status(201).json(exportItem);
  });

  app.get(api.exports.list.path, isAuthenticated, async (req: any, res) => {
    const projectId = parseInt(req.params.projectId);
    const exports = await storage.getExports(projectId);
    res.json(exports);
  });

  // Seed data if empty
  (async () => {
    try {
      // Create a test user for dev convenience if needed, 
      // but Replit Auth handles users dynamically.
      // We can seed a demo project if a user exists.
    } catch (e) {
      console.error("Seeding failed", e);
    }
  })();

  return httpServer;
}

import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
