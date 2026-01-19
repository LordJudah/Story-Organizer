import { pgTable, text, serial, integer, boolean, timestamp, jsonb, doublePrecision, varchar } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { index } from "drizzle-orm/pg-core";

// === AUTH MODELS ===
// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// === CHAT MODELS ===
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
/*
export const insertConversationSchema = {} as any;
export const insertMessageSchema = {} as any;
*/

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;


// === APP MODELS ===

// === PROJECTS ===
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  
  // Creative Direction
  prompt: text("prompt"),
  tone: text("tone").default("Documentary"), // Documentary, Personal, Cinematic, etc.
  targetLength: text("target_length"), // Short, Medium, Long
  focusElements: text("focus_elements"), // People, Places, etc.
  
  status: text("status").default("draft"), // draft, analyzing, sequencing, ready, exporting
  thumbnailUrl: text("thumbnail_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  mediaItems: many(mediaItems),
  scenes: many(scenes),
  exports: many(exports),
}));

// === MEDIA ITEMS ===
export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sceneId: integer("scene_id"), // Nullable, assigned later
  
  storagePath: text("storage_path").notNull(), // Object storage path
  url: text("url").notNull(), // Public or signed URL
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  
  // AI Analysis Data
  description: text("description"), // AI caption
  tags: text("tags").array(),
  location: text("location"),
  takenAt: timestamp("taken_at"), // From EXIF
  
  // Visual/Sequence properties
  isFavorite: boolean("is_favorite").default(false),
  isHidden: boolean("is_hidden").default(false),
  sequenceOrder: integer("sequence_order"), // Order within a scene or global?
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const mediaItemRelations = relations(mediaItems, ({ one }) => ({
  project: one(projects, {
    fields: [mediaItems.projectId],
    references: [projects.id],
  }),
  scene: one(scenes, {
    fields: [mediaItems.sceneId],
    references: [scenes.id],
  }),
}));

// === SCENES ===
export const scenes = pgTable("scenes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  orderIndex: integer("order_index").notNull(),
  title: text("title").notNull(),
  narrationText: text("narration_text"),
  
  startTime: doublePrecision("start_time"), // For video timeline export
  duration: doublePrecision("duration"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const sceneRelations = relations(scenes, ({ one, many }) => ({
  project: one(projects, {
    fields: [scenes.projectId],
    references: [projects.id],
  }),
  mediaItems: many(mediaItems),
}));

// === EXPORTS ===
export const exports = pgTable("exports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  format: text("format").notNull(), // PDF, DOCX, ZIP, PPTX
  status: text("status").notNull(), // pending, processing, complete, failed
  url: text("url"), // Download URL
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const exportRelations = relations(exports, ({ one }) => ({
  project: one(projects, {
    fields: [exports.projectId],
    references: [projects.id],
  }),
}));


// === SCHEMAS ===
export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  userId: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({ 
  id: true, 
  createdAt: true 
});

export const insertSceneSchema = createInsertSchema(scenes).omit({ 
  id: true, 
  createdAt: true 
});

export const insertExportSchema = createInsertSchema(exports).omit({ 
  id: true, 
  createdAt: true,
  url: true,
  errorMessage: true
});
/*
export const insertProjectSchema = {} as any;
export const insertMediaItemSchema = {} as any;
export const insertSceneSchema = {} as any;
export const insertExportSchema = {} as any;
*/

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type InsertScene = z.infer<typeof insertSceneSchema>;
export type InsertExport = z.infer<typeof insertExportSchema>;

// Server-side types that include userId for internal use
export type ServerInsertProject = InsertProject & { userId: string };

export type Project = typeof projects.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type Export = typeof exports.$inferSelect;

/*
export type InsertConversation = any;
export type InsertMessage = any;
export type InsertProject = any;
export type InsertMediaItem = any;
export type InsertScene = any;
export type InsertExport = any;
*/

// Request Types
export type CreateProjectRequest = InsertProject;
export type UpdateProjectRequest = Partial<InsertProject>;

export type CreateMediaItemRequest = InsertMediaItem;
export type UpdateMediaItemRequest = Partial<InsertMediaItem>;

export type CreateSceneRequest = InsertScene;
export type UpdateSceneRequest = Partial<InsertScene>;

// Responses
export type ProjectWithDetails = Project & {
  mediaCount?: number;
  sceneCount?: number;
};
