import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { UpdateSceneRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useScenes(projectId: number) {
  return useQuery({
    queryKey: [api.scenes.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.scenes.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scenes");
      return api.scenes.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useUpdateScene() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateSceneRequest) => {
      const url = buildUrl(api.scenes.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update scene");
      return api.scenes.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.scenes.list.path, data.projectId] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useReorderScenes() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, sceneIds }: { projectId: number, sceneIds: number[] }) => {
      const url = buildUrl(api.scenes.reorder.path, { projectId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneIds }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reorder scenes");
      return api.scenes.reorder.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      // Optimistic update often tricky with lists, so we just invalidate for now
      // Or we can manually set query data if we return the full list
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: [api.scenes.list.path, data[0].projectId] });
      }
    },
  });
}
