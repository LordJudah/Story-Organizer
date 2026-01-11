import { z } from 'zod';
import { 
  insertProjectSchema, 
  insertMediaItemSchema, 
  insertSceneSchema,
  insertExportSchema,
  projects,
  mediaItems,
  scenes,
  exports as exportTable
} from './schema';

// Shared Error Schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

// API Contract
export const api = {
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
        401: errorSchemas.unauthorized
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects',
      input: insertProjectSchema,
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: z.custom<typeof projects.$inferSelect & { scenes: any[], mediaItems: any[] }>(), // Extended with relations
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/projects/:id',
      input: insertProjectSchema.partial(),
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    analyze: {
      method: 'POST' as const,
      path: '/api/projects/:id/analyze',
      responses: {
        202: z.object({ message: z.string(), jobId: z.string().optional() }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      }
    }
  },
  
  media: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/media',
      responses: {
        200: z.array(z.custom<typeof mediaItems.$inferSelect>()),
        401: errorSchemas.unauthorized
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/media',
      input: insertMediaItemSchema.omit({ projectId: true }), // Project ID from param
      responses: {
        201: z.custom<typeof mediaItems.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/media/:id',
      input: insertMediaItemSchema.partial(),
      responses: {
        200: z.custom<typeof mediaItems.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/media/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    }
  },

  scenes: {
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/scenes',
      responses: {
        200: z.array(z.custom<typeof scenes.$inferSelect>()),
        401: errorSchemas.unauthorized
      },
    },
    // Bulk update for reordering
    reorder: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/scenes/reorder',
      input: z.object({
        sceneIds: z.array(z.number())
      }),
      responses: {
        200: z.array(z.custom<typeof scenes.$inferSelect>()),
        401: errorSchemas.unauthorized
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/scenes/:id',
      input: insertSceneSchema.partial(),
      responses: {
        200: z.custom<typeof scenes.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized
      },
    }
  },
  
  exports: {
    create: {
      method: 'POST' as const,
      path: '/api/projects/:projectId/export',
      input: insertExportSchema.omit({ projectId: true, status: true }),
      responses: {
        201: z.custom<typeof exportTable.$inferSelect>(),
        401: errorSchemas.unauthorized
      }
    },
    list: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/exports',
      responses: {
        200: z.array(z.custom<typeof exportTable.$inferSelect>()),
        401: errorSchemas.unauthorized
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
