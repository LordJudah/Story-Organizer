import { useEffect, useState, useRef, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { useProject, useAnalyzeProject } from "@/hooks/use-projects";
import { useMedia, useCreateMedia, useDeleteMedia, useUpdateMedia } from "@/hooks/use-media";
import { useScenes, useUpdateScene } from "@/hooks/use-scenes";
import { Sidebar } from "@/components/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ObjectUploader } from "@/components/ObjectUploader";
import { SceneEditDialog } from "@/components/SceneEditDialog";
import type { Scene, MediaItem } from "@shared/schema";
import { 
  ChevronLeft, 
  Wand2, 
  Upload, 
  Image as ImageIcon, 
  Film, 
  Trash2,
  ListVideo,
  FileText,
  Download,
  Edit3,
  GripVertical
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectDetails() {
  const [, params] = useRoute("/project/:id");
  const id = Number(params?.id);
  
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: mediaItems, isLoading: mediaLoading } = useMedia(id);
  const { data: scenes } = useScenes(id);
  
  const createMedia = useCreateMedia();
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();
  const updateScene = useUpdateScene();
  const analyzeProject = useAnalyzeProject();

  const [activeTab, setActiveTab] = useState("media");
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [sceneDialogOpen, setSceneDialogOpen] = useState(false);

  const handleSceneClick = (scene: Scene) => {
    setSelectedScene(scene);
    setSceneDialogOpen(true);
  };

  const handleSceneDialogClose = (open: boolean) => {
    setSceneDialogOpen(open);
    if (!open) {
      setSelectedScene(null);
    }
  };

  const handleSceneSave = (data: { title: string; narrationText: string }) => {
    if (!selectedScene) return;
    updateScene.mutate(
      { id: selectedScene.id, ...data },
      {
        onSuccess: () => {
          setSceneDialogOpen(false);
          setSelectedScene(null);
        },
      }
    );
  };

  const handleAddMediaToScene = (mediaId: number) => {
    if (!selectedScene) return;
    updateMedia.mutate({ id: mediaId, sceneId: selectedScene.id });
  };

  const handleRemoveMediaFromScene = (mediaId: number) => {
    updateMedia.mutate({ id: mediaId, sceneId: null });
  };

  const getSceneMedia = (sceneId: number) => {
    return mediaItems?.filter((m) => m.sceneId === sceneId) || [];
  };
  
  // Track file ID to objectPath mapping (Uppy doesn't persist meta changes in getUploadParameters)
  const filePathMapRef = useRef<Map<string, string>>(new Map());

  // Handle file uploads using the ObjectUploader component logic
  const handleUploadComplete = (result: any) => {
    // Uppy result.successful is an array of uploaded files
    result.successful.forEach((file: any) => {
      const objectPath = filePathMapRef.current.get(file.id);
      if (!objectPath) {
        console.error("Missing objectPath for uploaded file:", file.name, file.id);
        return;
      }
      
      createMedia.mutate({
        projectId: id,
        storagePath: objectPath,
        url: objectPath, // Use the /objects/... path which our server can serve
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      
      // Clean up the mapping
      filePathMapRef.current.delete(file.id);
    });
  };

  const getUploadParams = async (file: any) => {
    const res = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type,
      }),
    });
    const { uploadURL, objectPath } = await res.json();
    
    // Store the mapping using file.id
    filePathMapRef.current.set(file.id, objectPath);
    
    return {
      method: "PUT" as const,
      url: uploadURL,
      headers: { "Content-Type": file.type },
    };
  };

  if (projectLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card/50 p-6 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold">{project.title}</h1>
                <Badge variant="secondary" className="uppercase text-xs tracking-wider">
                  {project.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                Last updated {format(new Date(project.updatedAt || new Date()), "MMM d, HH:mm")}
                <span className="w-1 h-1 rounded-full bg-border" />
                {mediaItems?.length || 0} items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              onClick={() => analyzeProject.mutate(project.id)}
              disabled={analyzeProject.isPending}
            >
              <Wand2 className="w-4 h-4 mr-2 text-primary" />
              {analyzeProject.isPending ? "Analyzing..." : "Analyze Media"}
            </Button>
            <ObjectUploader
              maxFileSize={52428800}
              maxNumberOfFiles={20}
              onGetUploadParameters={getUploadParams}
              onComplete={handleUploadComplete}
              buttonClassName="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Media
            </ObjectUploader>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
            <div className="px-6 border-b border-border bg-background/50">
              <TabsList className="bg-transparent h-12 gap-6">
                <TabsTrigger 
                  value="media" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 h-full"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Media Library
                </TabsTrigger>
                <TabsTrigger 
                  value="storyboard"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 h-full"
                >
                  <ListVideo className="w-4 h-4 mr-2" />
                  Storyboard
                </TabsTrigger>
                <TabsTrigger 
                  value="script"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 h-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Script
                </TabsTrigger>
                <TabsTrigger 
                  value="exports"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-2 h-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exports
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="media" className="flex-1 min-h-0 p-6 overflow-y-auto m-0">
              {mediaLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="aspect-square rounded-xl" />
                  ))}
                </div>
              ) : mediaItems?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-card/10">
                  <div className="p-4 bg-background rounded-full mb-4">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No media yet</h3>
                  <p className="mb-6">Upload photos and videos to get started</p>
                  <ObjectUploader
                    maxFileSize={52428800}
                    maxNumberOfFiles={20}
                    onGetUploadParameters={getUploadParams}
                    onComplete={handleUploadComplete}
                  >
                    Upload Now
                  </ObjectUploader>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <AnimatePresence>
                    {mediaItems?.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        layout
                        className="group relative aspect-square bg-muted rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 transition-colors"
                      >
                        {item.mimeType.startsWith("video") ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/20">
                            <Film className="w-8 h-8 text-white/50" />
                            {/* In real app, would use a thumbnail for video */}
                          </div>
                        ) : (
                          <img 
                            src={item.url} 
                            alt={item.filename} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          />
                        )}
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <p className="text-xs text-white truncate font-medium">{item.filename}</p>
                          <div className="flex justify-end mt-2">
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-7 w-7 rounded-full"
                              onClick={() => deleteMedia.mutate({ id: item.id, projectId: id })}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {item.isFavorite && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full shadow-glow" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="storyboard" className="flex-1 min-h-0 p-6 overflow-y-auto m-0">
              <div className="max-w-3xl mx-auto space-y-4">
                {scenes && scenes.length > 0 ? (
                  scenes.map((scene, index) => {
                    const sceneMedia = getSceneMedia(scene.id);
                    const thumbnailMedia = sceneMedia.find((m) => m.mimeType.startsWith("image"));
                    
                    return (
                      <motion.div
                        key={scene.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition-colors cursor-pointer group"
                        onClick={() => handleSceneClick(scene)}
                        data-testid={`scene-card-${scene.id}`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="text-muted-foreground font-mono text-sm w-8 text-center">
                            {index + 1}
                          </div>
                          <GripVertical className="w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <div className="w-32 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                          {thumbnailMedia ? (
                            <img
                              src={thumbnailMedia.url}
                              alt={thumbnailMedia.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : sceneMedia.length > 0 ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/20">
                              <Film className="w-8 h-8 text-white/50" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                          {sceneMedia.length > 1 && (
                            <Badge 
                              variant="secondary" 
                              className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5"
                            >
                              +{sceneMedia.length - 1}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{scene.title}</h3>
                            <Edit3 className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {scene.narrationText || "No narration set..."}
                          </p>
                          {sceneMedia.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <div className="flex -space-x-2">
                                {sceneMedia.slice(0, 3).map((media) => (
                                  <div
                                    key={media.id}
                                    className="w-6 h-6 rounded-full border-2 border-card overflow-hidden"
                                  >
                                    {media.mimeType.startsWith("image") ? (
                                      <img
                                        src={media.url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <Film className="w-3 h-3 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {sceneMedia.length} {sceneMedia.length === 1 ? "item" : "items"}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground font-mono self-center">
                          {scene.duration ? `${scene.duration.toFixed(1)}s` : "--"}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-center py-20">
                    <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                      <ListVideo className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No scenes yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Use "Analyze Media" to automatically generate story scenes from your photos.
                    </p>
                    <Button 
                      onClick={() => analyzeProject.mutate(project.id)}
                      disabled={analyzeProject.isPending || !mediaItems?.length}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      {analyzeProject.isPending ? "Analyzing..." : "Analyze Media"}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="script" className="flex-1 p-6 overflow-y-auto m-0">
               <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-8 shadow-sm">
                 <h2 className="font-display text-xl font-bold mb-6">Narration Script</h2>
                 <div className="space-y-6">
                   {scenes?.map((scene, idx) => (
                     <div key={scene.id} className="flex gap-4">
                        <span className="text-xs font-mono text-muted-foreground pt-1 w-6">{idx + 1}</span>
                        <p className="leading-relaxed text-lg">{scene.narrationText || <span className="text-muted-foreground italic">Waiting for generation...</span>}</p>
                     </div>
                   ))}
                   {(!scenes || scenes.length === 0) && (
                     <p className="text-muted-foreground italic text-center">No script generated yet.</p>
                   )}
                 </div>
               </div>
            </TabsContent>

            <TabsContent value="exports" className="flex-1 p-6 overflow-y-auto m-0">
              <div className="text-center py-20 text-muted-foreground">
                <Download className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Export functionality coming soon.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <SceneEditDialog
        scene={selectedScene}
        open={sceneDialogOpen}
        onOpenChange={handleSceneDialogClose}
        onSave={handleSceneSave}
        onRemoveMedia={handleRemoveMediaFromScene}
        allMedia={mediaItems || []}
        onAddMedia={handleAddMediaToScene}
        isPending={updateScene.isPending}
      />
    </div>
  );
}
