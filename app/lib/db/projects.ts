/**
 * @file Project queries — all scoped by `userId` so a user can only ever read
 * or mutate their own projects.
 */

import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { requireDb } from "./index";
import { projects, type BrandIdentity, type ProjectRow, type SiteMapEntry } from "./schema";

export async function listProjects(userId: string): Promise<ProjectRow[]> {
  return requireDb()
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function createProject(input: {
  userId: string;
  name: string;
  siteUrl: string;
}): Promise<ProjectRow> {
  const rows = await requireDb()
    .insert(projects)
    .values({ userId: input.userId, name: input.name.trim(), siteUrl: input.siteUrl.trim() })
    .returning();
  return rows[0];
}

/** Create a project that has already been gathered (status `ready`). */
export async function createReadyProject(input: {
  userId: string;
  name: string;
  siteUrl: string;
  brandIdentity: BrandIdentity;
  siteMap: SiteMapEntry[];
  summary: string;
}): Promise<ProjectRow> {
  const rows = await requireDb()
    .insert(projects)
    .values({
      userId: input.userId,
      name: input.name.trim(),
      siteUrl: input.siteUrl.trim(),
      status: "ready",
      brandIdentity: input.brandIdentity,
      siteMap: input.siteMap,
      summary: input.summary,
    })
    .returning();
  return rows[0];
}

export async function setProjectStatus(
  id: string,
  userId: string,
  status: "gathering" | "ready" | "failed",
): Promise<void> {
  await requireDb()
    .update(projects)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function getProject(id: string, userId: string): Promise<ProjectRow | null> {
  const rows = await requireDb()
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Mark a project's gather complete and store the gathered details. */
export async function setProjectGathered(
  id: string,
  userId: string,
  data: { brandIdentity: BrandIdentity; siteMap: SiteMapEntry[]; summary: string },
): Promise<void> {
  await requireDb()
    .update(projects)
    .set({
      status: "ready",
      brandIdentity: data.brandIdentity,
      siteMap: data.siteMap,
      summary: data.summary,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  await requireDb()
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}
