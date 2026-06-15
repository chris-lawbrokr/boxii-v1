"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, Circle, Search, Sparkles, User } from "lucide-react";
import { gatherSiteAction, createProjectFromGatherAction } from "@/app/lib/project-actions";
import type { GatherResult } from "@/app/lib/gather";

type Phase = "idle" | "scanning" | "review" | "creating";

const SCAN_STEPS = [
  "Fetching the homepage…",
  "Reading your branding…",
  "Mapping your pages…",
  "Writing a summary…",
];

export function NewProjectChat() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [result, setResult] = useState<GatherResult | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Advance the "thinking" steps while scanning.
  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setInterval(() => setScanStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1)), 1300);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [phase, error]);

  async function scan(url: string) {
    setSubmittedUrl(url);
    setError(null);
    setResult(null);
    setScanStep(0);
    setPhase("scanning");
    const res = await gatherSiteAction(url);
    if (res.ok) {
      setResult(res.result);
      setName(res.result.suggestedName);
      setPhase("review");
    } else {
      setError(res.error);
      setPhase("idle");
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    setInput("");
    scan(v);
  }

  async function create() {
    if (!result) return;
    setPhase("creating");
    try {
      await createProjectFromGatherAction({ url: submittedUrl, name, result });
      // redirect happens server-side
    } catch {
      setError("Couldn't create the project. Please try again.");
      setPhase("review");
    }
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setError(null);
    setSubmittedUrl("");
  }

  return (
    <div className="flex flex-col gap-4">
      <Bubble role="assistant">
        <p className="font-medium text-gray-900">Let&apos;s set up a new project.</p>
        <p className="mt-1 text-gray-600">
          Paste your website URL and I&apos;ll scan it — pulling your logo, brand colors, site map,
          and a summary so your popovers match your brand.
        </p>
      </Bubble>

      {submittedUrl && (
        <Bubble role="user">
          <span className="break-all">{submittedUrl}</span>
        </Bubble>
      )}

      {phase === "scanning" && (
        <Bubble role="assistant">
          <div className="flex items-center gap-2 text-gray-700">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Scanning {hostOf(submittedUrl)}…</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {SCAN_STEPS.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-1.5 ${
                  i <= scanStep ? "text-gray-700" : "text-gray-300"
                }`}
              >
                {i < scanStep ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : i === scanStep ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                {s}
              </li>
            ))}
          </ul>
        </Bubble>
      )}

      {error && (
        <Bubble role="assistant">
          <p className="text-gray-800">Hmm — {error}</p>
          <p className="mt-1 text-sm text-gray-500">Want to try another URL?</p>
        </Bubble>
      )}

      {(phase === "review" || phase === "creating") && result && (
        <Bubble role="assistant">
          <p className="text-gray-800">
            Here&apos;s what I found for <span className="font-medium">{hostOf(submittedUrl)}</span>:
          </p>
          <Findings result={result} />

          <div className="mt-4 border-t border-gray-100 pt-4">
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
              Project name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={create}
                disabled={phase === "creating"}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
              >
                {phase === "creating" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {phase === "creating" ? "Creating…" : "Create project"}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={phase === "creating"}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-60"
              >
                Try another URL
              </button>
            </div>
          </div>
        </Bubble>
      )}

      {(phase === "idle" || error) && (
        <form onSubmit={onSubmit} className="mt-2 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="yourwebsite.com"
            autoFocus
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Search className="h-4 w-4" />
            Scan site
          </button>
        </form>
      )}

      <div ref={scrollRef} />
    </div>
  );
}

function Findings({ result }: { result: GatherResult }) {
  const { brandIdentity, siteMap, summary } = result;
  return (
    <div className="mt-3 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {brandIdentity.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandIdentity.logoUrl}
            alt="Logo"
            className="h-10 max-w-[160px] object-contain"
          />
        )}
        {brandIdentity.colors.length > 0 && (
          <div className="flex items-center gap-2">
            {brandIdentity.colors.map((c) => (
              <span
                key={c}
                title={c}
                className="h-7 w-7 rounded-full border border-gray-200 shadow-sm"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-700">{summary}</p>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {(brandIdentity.fonts.length > 0 || brandIdentity.voice) && (
          <div>
            <p className="font-medium text-gray-800">Brand</p>
            {brandIdentity.fonts.length > 0 && (
              <p className="text-gray-600">Fonts: {brandIdentity.fonts.join(", ")}</p>
            )}
            {brandIdentity.voice && <p className="text-gray-600">Voice: {brandIdentity.voice}</p>}
          </div>
        )}
        {siteMap.length > 0 && (
          <div>
            <p className="font-medium text-gray-800">Site map ({siteMap.length})</p>
            <ul className="text-gray-600">
              {siteMap.slice(0, 6).map((s) => (
                <li key={s.url} className="truncate">
                  {s.title}
                </li>
              ))}
              {siteMap.length > 6 && <li className="text-gray-400">+{siteMap.length - 6} more</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: "assistant" | "user"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-gray-200 text-gray-600" : "bg-indigo-600 text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-700"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
