import { Link } from "wouter";
import { format } from "date-fns";
import type { Project } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Film, MoreVertical, Trash2, Edit2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: Project & { mediaCount?: number };
  onDelete?: (id: number) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const statusColors = {
    draft: "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20",
    analyzing: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
    sequencing: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
    ready: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    exporting: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  };

  return (
    <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 bg-card/50 overflow-hidden flex flex-col h-full">
      <div className="aspect-video w-full bg-muted/30 relative overflow-hidden">
        {project.thumbnailUrl ? (
          <img 
            src={project.thumbnailUrl} 
            alt={project.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Film className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className={statusColors[project.status as keyof typeof statusColors] || "bg-secondary"}>
            {project.status}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/project/${project.id}`} className="hover:underline decoration-primary/50 underline-offset-4">
            <CardTitle className="text-lg font-display leading-tight line-clamp-1">{project.title}</CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/project/${project.id}`}>
                <DropdownMenuItem>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
              </Link>
              {onDelete && (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(project.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description || "No description"}
        </p>
      </CardContent>

      <CardFooter className="pt-2 text-xs text-muted-foreground border-t border-border/50 flex justify-between">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {project.updatedAt ? format(new Date(project.updatedAt), "MMM d, yyyy") : "Unknown"}
        </span>
        <span>{project.mediaCount || 0} items</span>
      </CardFooter>
    </Card>
  );
}
