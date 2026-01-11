import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateMediaItemRequest, UpdateMediaItemRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMedia(projectId: number) {
  return useQuery({
    queryKey: [api.media.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.media.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch media");
      return api.media.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useCreateMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, ...data }: { projectId: number } & Omit<CreateMediaItemRequest, "projectId">) => {
      const url = buildUrl(api.media.create.path, { projectId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add media item");
      return api.media.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path, data.projectId] });
      queryClient.invalidateQueries({ queryKey: [api.projects.get.path, data.projectId] }); // Update counts
      toast({ title: "Success", description: "Media added successfully" });
    },
  });
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateMediaItemRequest) => {
      const url = buildUrl(api.media.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update media item");
      return api.media.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path, data.projectId] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      const url = buildUrl(api.media.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete media item");
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: [api.media.list.path, projectId] });
      queryClient.invalidateQueries({ queryKey: [api.projects.get.path, projectId] });
      toast({ title: "Deleted", description: "Media item removed" });
    },
  });
}
