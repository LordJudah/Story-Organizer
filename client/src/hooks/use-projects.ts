import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateProjectRequest, UpdateProjectRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useProjects() {
  return useQuery({
    queryKey: [api.projects.list.path],
    queryFn: async () => {
      const res = await fetch(api.projects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return api.projects.list.responses[200].parse(await res.json());
    },
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: [api.projects.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.projects.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return api.projects.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      const res = await fetch(api.projects.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create project");
      return api.projects.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      toast({ title: "Success", description: "Project created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateProjectRequest) => {
      const url = buildUrl(api.projects.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update project");
      return api.projects.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.projects.get.path, data.id] });
      toast({ title: "Saved", description: "Project updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.projects.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete project");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      toast({ title: "Deleted", description: "Project removed" });
    },
  });
}

export function useAnalyzeProject() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.projects.analyze.path.replace(':id', ':id'), { id });
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start analysis");
      
      // Poll for completion since analysis runs in background
      const pollForCompletion = async () => {
        const projectUrl = buildUrl(api.projects.get.path, { id });
        for (let i = 0; i < 30; i++) { // Poll for up to 30 seconds
          await new Promise(r => setTimeout(r, 1000));
          const projectRes = await fetch(projectUrl, { credentials: "include" });
          if (projectRes.ok) {
            const project = await projectRes.json();
            if (project.status === "ready" || project.status === "failed") {
              // Invalidate all relevant queries - use the actual api path patterns
              queryClient.invalidateQueries({ queryKey: [api.projects.get.path, id] });
              queryClient.invalidateQueries({ queryKey: ["/api/projects/:projectId/scenes", id] });
              queryClient.invalidateQueries({ queryKey: ["/api/projects/:projectId/media", id] });
              return project.status;
            }
          }
        }
        return "timeout";
      };
      
      pollForCompletion().then(status => {
        if (status === "ready") {
          toast({ title: "Analysis Complete", description: "Your scenes are ready!" });
        } else if (status === "failed") {
          toast({ title: "Analysis Failed", description: "There was a problem analyzing your media.", variant: "destructive" });
        }
      });
      
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Analysis Started", description: "Creating scenes from your media..." });
    },
  });
}
