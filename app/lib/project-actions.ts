"use server";

/**
 * @file Server actions for projects + configurations. Each verifies the
 * signed-in user and scopes every DB call to that user.
 */

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "./dal";
import {
  createReadyProject,
  deleteProject,
  getProject,
  setProjectGathered,
  setProjectStatus,
} from "./db/projects";
import { createConfiguration, deleteConfiguration } from "./db/configurations";
import { gatherSite, GatherError, type GatherResult } from "./gather";

export type FormState = { error?: string } | undefined;

/** Add https:// if the user omitted a scheme, then validate. */
function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return z.url().safeParse(withScheme).success ? withScheme : null;
}

export type GatherActionResult =
  | { ok: true; result: GatherResult }
  | { ok: false; error: string };

/** Scan a site (Firecrawl + Gemini) and return the gathered details. */
export async function gatherSiteAction(rawUrl: string): Promise<GatherActionResult> {
  await requireUser();
  const url = normalizeUrl(rawUrl);
  if (!url) return { ok: false, error: "That doesn't look like a valid URL." };

  try {
    const result = await gatherSite(url);
    return { ok: true, result };
  } catch (err) {
    if (err instanceof GatherError) return { ok: false, error: err.message };
    console.error("[boxii] gather error:", err);
    return { ok: false, error: "Something went wrong while scanning that site." };
  }
}

/** Persist a project from an already-gathered result, then open it. */
export async function createProjectFromGatherAction(payload: {
  url: string;
  name: string;
  result: GatherResult;
}): Promise<void> {
  const user = await requireUser();
  const url = normalizeUrl(payload.url);
  if (!url) return;
  const name = payload.name.trim() || payload.result.suggestedName || url;

  const project = await createReadyProject({
    userId: user.id,
    name,
    siteUrl: url,
    brandIdentity: payload.result.brandIdentity,
    siteMap: payload.result.siteMap,
    summary: payload.result.summary,
  });

  redirect(`/dashboard/projects/${project.id}`);
}

/** Re-scan a project's site (used from the project page). */
export async function runGatherAction(projectId: string): Promise<void> {
  const user = await requireUser();
  const project = await getProject(projectId, user.id);
  if (!project) redirect("/dashboard");

  try {
    const result = await gatherSite(project.siteUrl);
    await setProjectGathered(projectId, user.id, result);
  } catch (err) {
    console.error("[boxii] re-gather error:", err);
    await setProjectStatus(projectId, user.id, "failed");
  }
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function deleteProjectAction(projectId: string): Promise<void> {
  const user = await requireUser();
  await deleteProject(projectId, user.id);
  redirect("/dashboard");
}

export async function createConfigurationAction(
  projectId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const project = await getProject(projectId, user.id);
  if (!project) redirect("/dashboard");

  const name = String(formData.get("name") ?? "").trim() || "Untitled configuration";
  const config = await createConfiguration({ projectId, name });
  redirect(`/dashboard/projects/${projectId}/configurations/${config.id}`);
}

export async function deleteConfigurationAction(
  configId: string,
  projectId: string,
): Promise<void> {
  const user = await requireUser();
  await deleteConfiguration(configId, user.id);
  revalidatePath(`/dashboard/projects/${projectId}`);
}
