/**
 * @file Drizzle schema — Neon Postgres.
 *
 * `users` holds Boxii accounts (email + scrypt password hash + role). This is
 * where Boxii-owned data (designs, sites, …) will later hang off the user.
 */

import { pgTable, text, timestamp, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["customer", "admin"]);

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

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
