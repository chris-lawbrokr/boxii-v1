/**
 * @file Drizzle schema — Neon Postgres.
 *
 * Model: a user has many **projects** (one per site). Creating a project kicks
 * off a "gather" flow that scrapes the site into a brand identity, site map,
 * and summary/objective. Each project then holds many **configurations** (the
 * drag-and-drop popover designs).
 */

import { pgTable, text, timestamp, uniqueIndex, index, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["customer", "admin"]);
export const projectStatusEnum = pgEnum("project_status", ["gathering", "ready", "failed"]);
export const configStatusEnum = pgEnum("config_status", ["draft", "published"]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull().default("customer"),
    /** scrypt hash (`scrypt$salt$hash`). */
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

/** Gathered brand identity for a site (populated by the gather flow). */
export type BrandIdentity = {
  colors: string[];
  fonts: string[];
  logoUrl?: string;
  voice?: string;
};

/** A single page discovered during the gather/site-map step. */
export type SiteMapEntry = { url: string; title: string };

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    siteUrl: text("site_url").notNull(),
    status: projectStatusEnum("status").notNull().default("gathering"),
    /** Gathered details — null until the gather flow completes. */
    brandIdentity: jsonb("brand_identity").$type<BrandIdentity>(),
    siteMap: jsonb("site_map").$type<SiteMapEntry[]>(),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_user_idx").on(t.userId)],
);

export const configurations = pgTable(
  "configurations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: configStatusEnum("status").notNull().default("draft"),
    /** Drag-and-drop widget layout (filled by the builder, later). */
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("configurations_project_idx").on(t.projectId)],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type ProjectRow = typeof projects.$inferSelect;
export type ConfigurationRow = typeof configurations.$inferSelect;
