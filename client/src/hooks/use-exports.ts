import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useExports(projectId: number) {
  return useQuery({
    queryKey: [api.exports.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.exports.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch exports");
      return api.exports.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useCreateExport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, format }: { projectId: number, format: string }) => {
      const url = buildUrl(api.exports.create.path, { projectId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start export");
      return api.exports.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.exports.list.path, data.projectId] });
      toast({ title: "Export Started", description: "We are processing your story." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
