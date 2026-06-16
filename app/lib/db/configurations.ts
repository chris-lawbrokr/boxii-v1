/**
 * @file Configuration queries. Ownership is enforced via the parent project's
 * `userId` (configurations belong to a project, which belongs to a user).
 */

import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { requireDb } from "./index";
import { configurations, projects, type ConfigurationRow, type ProjectRow } from "./schema";

export async function listConfigurations(projectId: string): Promise<ConfigurationRow[]> {
  return requireDb()
    .select()
    .from(configurations)
    .where(eq(configurations.projectId, projectId))
    .orderBy(desc(configurations.createdAt));
}

export async function createConfiguration(input: {
  projectId: string;
  name: string;
}): Promise<ConfigurationRow> {
  const rows = await requireDb()
    .insert(configurations)
    .values({ projectId: input.projectId, name: input.name.trim() })
    .returning();
  return rows[0];
}

/** Fetch a configuration plus its project, but only if the user owns it. */
export async function getConfigurationForUser(
  configId: string,
  userId: string,
): Promise<{ config: ConfigurationRow; project: ProjectRow } | null> {
  const rows = await requireDb()
    .select({ config: configurations, project: projects })
    .from(configurations)
    .innerJoin(projects, eq(configurations.projectId, projects.id))
    .where(and(eq(configurations.id, configId), eq(projects.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function renameConfiguration(
  configId: string,
  userId: string,
  name: string,
): Promise<void> {
  // Only rename if the user owns the parent project.
  const owned = await getConfigurationForUser(configId, userId);
  if (!owned) return;
  await requireDb()
    .update(configurations)
    .set({ name: name.trim() })
    .where(eq(configurations.id, configId));
}

export async function saveConfigurationLayout(
  configId: string,
  userId: string,
  config: Record<string, unknown>,
): Promise<void> {
  // Only save if the user owns the parent project.
  const owned = await getConfigurationForUser(configId, userId);
  if (!owned) return;
  await requireDb()
    .update(configurations)
    .set({ config })
    .where(eq(configurations.id, configId));
}

export async function deleteConfiguration(configId: string, userId: string): Promise<void> {
  // Only delete if the user owns the parent project.
  const owned = await getConfigurationForUser(configId, userId);
  if (!owned) return;
  await requireDb().delete(configurations).where(eq(configurations.id, configId));
}
