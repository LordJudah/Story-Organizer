import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Film, ImageIcon, Check, X, GripVertical, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Scene, MediaItem } from "@shared/schema";

interface SceneEditDialogProps {
  scene: Scene | null;
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; narrationText: string }) => void;
  onRemoveMedia: (mediaId: number) => void;
  allMedia: MediaItem[];
  onAddMedia: (mediaId: number) => void;
  isPending?: boolean;
}

export function SceneEditDialog({
  scene,
  projectId,
  open,
  onOpenChange,
  onSave,
  onRemoveMedia,
  allMedia,
  onAddMedia,
  isPending,
}: SceneEditDialogProps) {
  const [title, setTitle] = useState("");
  const [narrationText, setNarrationText] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (scene && open) {
      setTitle(scene.title);
      setNarrationText(scene.narrationText || "");
      setShowMediaPicker(false);
    }
  }, [scene?.id, open]);

  useEffect(() => {
    if (!open) {
      setShowMediaPicker(false);
    }
  }, [open]);

  if (!scene) return null;

  const sceneMedia = allMedia.filter((m) => m.sceneId === scene.id);
  const availableMedia = allMedia.filter((m) => !m.sceneId || m.sceneId === scene.id);

  const handleSave = () => {
    onSave({ title, narrationText });
  };

  const handleGenerateNarration = async () => {
    if (!scene) return;
    
    setIsGenerating(true);
    try {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/scenes/${scene.id}/generate-narration`
      );
      const updatedScene = await response.json();
      setNarrationText(updatedScene.narrationText || "");
      toast({
        title: "Narration Generated",
        description: "AI has created narration for this scene.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'scenes'] });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate narration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm">Scene {scene.orderIndex + 1}</span>
            <span className="text-muted-foreground">/</span>
            Edit Scene
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 h-full">
          <div className="space-y-6 py-4 pr-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="scene-title">Scene Title</Label>
            <Input
              id="scene-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter scene title..."
              data-testid="input-scene-title"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="scene-narration">Narration Text</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateNarration}
                disabled={isGenerating || sceneMedia.length === 0}
                data-testid="button-generate-narration"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="scene-narration"
              value={narrationText}
              onChange={(e) => setNarrationText(e.target.value)}
              placeholder="Enter the voiceover narration for this scene..."
              rows={4}
              className="resize-none"
              data-testid="input-scene-narration"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Scene Media ({sceneMedia.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMediaPicker(!showMediaPicker)}
                data-testid="button-toggle-media-picker"
              >
                {showMediaPicker ? "Done" : "Add Media"}
              </Button>
            </div>

            {showMediaPicker ? (
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-3">
                  Click on media to add it to this scene
                </p>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {availableMedia.map((media) => {
                    const isInScene = media.sceneId === scene.id;
                    return (
                      <div
                        key={media.id}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                          isInScene
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-transparent hover:border-primary/50"
                        }`}
                        onClick={() => {
                          if (isInScene) {
                            onRemoveMedia(media.id);
                          } else {
                            onAddMedia(media.id);
                          }
                        }}
                        data-testid={`media-picker-item-${media.id}`}
                      >
                        {media.mimeType.startsWith("video") ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/20">
                            <Film className="w-6 h-6 text-white/50" />
                          </div>
                        ) : (
                          <img
                            src={media.url}
                            alt={media.filename}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {isInScene && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : sceneMedia.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {sceneMedia.map((media) => (
                  <div
                    key={media.id}
                    className="relative aspect-square rounded-lg overflow-hidden group border border-border"
                  >
                    {media.mimeType.startsWith("video") ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/20">
                        <Film className="w-6 h-6 text-white/50" />
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={media.filename}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveMedia(media.id)}
                      data-testid={`button-remove-media-${media.id}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No media in this scene</p>
                <p className="text-xs mt-1">Click "Add Media" to assign photos or videos</p>
              </div>
            )}
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-scene">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} data-testid="button-save-scene">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
