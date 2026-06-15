import "server-only";
import { cache } from "react";
import { getProject } from "./db/projects";

/** Memoized per request so the @sidebar slot and the page don't both query. */
export const getProjectForView = cache(getProject);
