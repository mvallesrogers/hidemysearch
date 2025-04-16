import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const recentSearches = pgTable("recent_searches", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title"),
  favicon: text("favicon"),
  visited_at: timestamp("visited_at").defaultNow().notNull(),
  user_id: integer("user_id").references(() => users.id),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRecentSearchSchema = createInsertSchema(recentSearches).pick({
  url: true,
  title: true,
  favicon: true,
  user_id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RecentSearch = typeof recentSearches.$inferSelect;
export type InsertRecentSearch = z.infer<typeof insertRecentSearchSchema>;
