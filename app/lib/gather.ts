/**
 * @file Site "gather" — Firecrawl (scrape brand identity, summary, sitemap) +
 * Google Gemini (conversational summary + brand voice).
 *
 *   Firecrawl `scrape` (formats: markdown, summary, branding) → logo, brand
 *   colors, fonts, base summary. `map` → sitemap. Gemini turns the content into
 *   a short, friendly summary covering what the site is and its objective.
 *
 * Best-effort: a Firecrawl scrape failure is fatal (we can't gather), but the
 * sitemap and the Gemini step degrade gracefully.
 */

import "server-only";
import { Firecrawl } from "firecrawl";
import { GoogleGenAI } from "@google/genai";
import type { BrandIdentity, SiteMapEntry } from "./db/schema";

export interface GatherResult {
  brandIdentity: BrandIdentity;
  siteMap: SiteMapEntry[];
  summary: string;
  /** A friendly project name suggestion derived from the site. */
  suggestedName: string;
}

/** Thrown for user-facing gather failures (surfaced in the wizard). */
export class GatherError extends Error {}

const DEFAULT_MODEL = "gemini-3.5-flash";

function uniq(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim().length > 0))];
}

function titleFromUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    if (!seg) return u.hostname.replace(/^www\./, "");
    return seg.replace(/[-_]/g, " ").replace(/\.\w+$/, "").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return raw;
  }
}

function nameFromSite(siteUrl: string, metaTitle?: string): string {
  if (metaTitle && metaTitle.trim()) return metaTitle.split(/[|\-–—]/)[0].trim();
  try {
    const host = new URL(siteUrl).hostname.replace(/^www\./, "");
    const base = host.split(".")[0] || host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return siteUrl;
  }
}

export async function gatherSite(siteUrl: string): Promise<GatherResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new GatherError("FIRECRAWL_API_KEY is not set on the server.");
  const firecrawl = new Firecrawl({ apiKey });

  // --- Scrape the main page (brand identity + summary + content) ---
  let doc;
  try {
    doc = await firecrawl.scrape(siteUrl, {
      formats: ["markdown", "summary", "branding"],
      onlyMainContent: true,
    });
  } catch (err) {
    throw new GatherError(`Couldn't scan that site (${(err as Error).message}).`);
  }

  const branding = doc.branding ?? {};
  const colors = uniq([
    branding.colors?.primary,
    branding.colors?.secondary,
    branding.colors?.accent,
    branding.colors?.background,
    branding.colors?.textPrimary,
    branding.colors?.link,
  ]).slice(0, 6);
  const fonts = uniq((branding.fonts ?? []).map((f) => f.family)).slice(0, 4);
  const logoUrl = branding.logo ?? doc.metadata?.ogImage ?? undefined;

  // --- Sitemap (best-effort) ---
  let siteMap: SiteMapEntry[] = [];
  try {
    const mapData = await firecrawl.map(siteUrl, { limit: 25 });
    siteMap = (mapData.links ?? [])
      .slice(0, 12)
      .map((l) => ({ url: l.url, title: (l.title && l.title.trim()) || titleFromUrl(l.url) }));
  } catch {
    // sitemap is optional
  }

  // --- Conversational summary + voice via Gemini (best-effort) ---
  const ai = await geminiSummary(siteUrl, doc.markdown ?? "", doc.summary ?? "");

  const summary =
    ai.summary || doc.summary || `A website at ${siteUrl}. (No summary could be generated.)`;

  return {
    brandIdentity: { colors, fonts, logoUrl, voice: ai.voice },
    siteMap,
    summary,
    suggestedName: nameFromSite(siteUrl, doc.metadata?.title),
  };
}

async function geminiSummary(
  url: string,
  markdown: string,
  firecrawlSummary: string,
): Promise<{ summary?: string; voice?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return {}; // Gemini is optional — fall back to Firecrawl's summary.

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const context =
      (firecrawlSummary ? `Firecrawl summary:\n${firecrawlSummary}\n\n` : "") +
      `Page content (markdown, truncated):\n${markdown.slice(0, 12000)}`;

    const res = await ai.models.generateContent({
      model,
      contents:
        `You are setting up on-site popovers for the website ${url}. Read the content and reply ` +
        `with ONLY a JSON object of the form {"summary": string, "voice": string}.\n` +
        `- "summary": 2-3 friendly sentences covering what the site is, who it's for, and its ` +
        `primary objective / conversion goal.\n` +
        `- "voice": a short phrase for the brand's tone (e.g. "Professional and reassuring").\n\n` +
        context,
      config: { responseMimeType: "application/json", temperature: 0.4 },
    });

    const parsed = JSON.parse(res.text ?? "{}");
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
      voice: typeof parsed.voice === "string" ? parsed.voice : undefined,
    };
  } catch {
    return {}; // degrade gracefully to the Firecrawl summary
  }
}
