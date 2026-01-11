import { 
  users, projects, mediaItems, scenes, exports as exportTable,
  type User, type Project, type MediaItem, type Scene, type Export,
  type InsertUser, type InsertProject, type InsertMediaItem, type InsertScene, type InsertExport
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users (handled by Auth storage mostly, but helper here)
  getUser(id: string): Promise<User | undefined>;
  
  // Projects
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Media
  getMediaItems(projectId: number): Promise<MediaItem[]>;
  getMediaItem(id: number): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  updateMediaItem(id: number, updates: Partial<InsertMediaItem>): Promise<MediaItem>;
  deleteMediaItem(id: number): Promise<void>;
  
  // Scenes
  getScenes(projectId: number): Promise<Scene[]>;
  createScene(scene: InsertScene): Promise<Scene>;
  updateScene(id: number, updates: Partial<InsertScene>): Promise<Scene>;
  deleteScene(id: number): Promise<void>;
  reorderScenes(sceneIds: number[]): Promise<void>;
  
  // Exports
  getExports(projectId: number): Promise<Export[]>;
  createExport(item: InsertExport): Promise<Export>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Projects
  async getProjects(userId: string): Promise<Project[]> {
    return await db.select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Media
  async getMediaItems(projectId: number): Promise<MediaItem[]> {
    return await db.select()
      .from(mediaItems)
      .where(eq(mediaItems.projectId, projectId))
      .orderBy(mediaItems.createdAt);
  }

  async getMediaItem(id: number): Promise<MediaItem | undefined> {
    const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    return item;
  }

  async createMediaItem(item: InsertMediaItem): Promise<MediaItem> {
    const [newItem] = await db.insert(mediaItems).values(item).returning();
    return newItem;
  }

  async updateMediaItem(id: number, updates: Partial<InsertMediaItem>): Promise<MediaItem> {
    const [updated] = await db.update(mediaItems)
      .set(updates)
      .where(eq(mediaItems.id, id))
      .returning();
    return updated;
  }

  async deleteMediaItem(id: number): Promise<void> {
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
  }

  // Scenes
  async getScenes(projectId: number): Promise<Scene[]> {
    return await db.select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(scenes.orderIndex);
  }

  async createScene(scene: InsertScene): Promise<Scene> {
    const [newScene] = await db.insert(scenes).values(scene).returning();
    return newScene;
  }

  async updateScene(id: number, updates: Partial<InsertScene>): Promise<Scene> {
    const [updated] = await db.update(scenes)
      .set(updates)
      .where(eq(scenes.id, id))
      .returning();
    return updated;
  }

  async deleteScene(id: number): Promise<void> {
    await db.delete(scenes).where(eq(scenes.id, id));
  }
  
  async reorderScenes(sceneIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < sceneIds.length; i++) {
        await tx.update(scenes)
          .set({ orderIndex: i })
          .where(eq(scenes.id, sceneIds[i]));
      }
    });
  }

  // Exports
  async getExports(projectId: number): Promise<Export[]> {
    return await db.select()
      .from(exportTable)
      .where(eq(exportTable.projectId, projectId))
      .orderBy(desc(exportTable.createdAt));
  }

  async createExport(item: InsertExport): Promise<Export> {
    const [newExport] = await db.insert(exportTable).values(item).returning();
    return newExport;
  }
}

export const storage = new DatabaseStorage();
