import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createHash } from "crypto";
import {
  DEFAULT_POLICY,
  parseGithubUrl,
  scanSecrets,
  shouldInclude,
  stableStringify,
} from "@/lib/policy";

type GhTreeEntry = { path: string; type: string; size?: number; sha: string };

async function gh(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "comptext-web",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

const InspectInput = z.object({
  repoUrl: z.string().url(),
  ref: z.string().min(1).max(80).default("main"),
  task: z.string().min(3).max(2000),
});

export const inspectRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InspectInput.parse(d))
  .handler(async ({ data, context }) => {
    const parsed = parseGithubUrl(data.repoUrl);
    if (!parsed) throw new Error("Invalid GitHub repository URL");
    const { owner, repo } = parsed;

    // Resolve ref → tree SHA
    const branch = (await gh(
      `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(data.ref)}`,
    )) as { commit: { sha: string; commit: { tree: { sha: string } } } };
    const treeSha = branch.commit.commit.tree.sha;
    const commitSha = branch.commit.sha;

    const tree = (await gh(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    )) as { tree: GhTreeEntry[]; truncated: boolean };

    const policy = DEFAULT_POLICY;
    const candidates = tree.tree
      .filter((e) => e.type === "blob")
      .filter((e) => shouldInclude(e.path, policy).include)
      .filter((e) => (e.size ?? 0) <= policy.maxFileKb * 1024)
      .sort((a, b) => a.path.localeCompare(b.path))
      .slice(0, policy.maxFiles);

    // Fetch contents via raw URL (anonymous, public repos only for MVP)
    const files: { path: string; sha: string; size: number; sha256: string; preview: string }[] = [];
    let blocked: string | null = null;
    let totalBytes = 0;

    for (const e of candidates) {
      const raw = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${e.path}`,
        { headers: { "User-Agent": "comptext-web" } },
      );
      if (!raw.ok) continue;
      const text = await raw.text();
      const hits = scanSecrets(text);
      if (hits.length) {
        blocked = `Secret-like pattern detected in ${e.path}: ${hits.join(", ")}`;
        break;
      }
      const sha256 = createHash("sha256").update(text).digest("hex");
      files.push({
        path: e.path,
        sha: e.sha,
        size: text.length,
        sha256,
        preview: text.slice(0, 8000),
      });
      totalBytes += text.length;
    }

    const pack = {
      schema: "comptext.context-pack/v1",
      repo: { owner, repo, url: `https://github.com/${owner}/${repo}` },
      ref: data.ref,
      commit: commitSha,
      task: data.task,
      policy: { allowGlobs: policy.allowGlobs, denyGlobs: policy.denyGlobs, maxFileKb: policy.maxFileKb, maxFiles: policy.maxFiles },
      files,
      stats: { fileCount: files.length, totalBytes, treeTruncated: tree.truncated },
    };
    const packStr = stableStringify(pack);
    const packSha = createHash("sha256").update(packStr).digest("hex");

    const gateStatus: "pass" | "blocked" = blocked ? "blocked" : "pass";
    const gateReason = blocked ?? (files.length === 0 ? "No files matched the allow policy" : null);
    const finalGate: "pass" | "blocked" = gateReason && !blocked ? "blocked" : gateStatus;

    const { data: row, error } = await context.supabase
      .from("context_packs")
      .insert({
        user_id: context.userId,
        repo_url: pack.repo.url,
        ref: data.ref,
        task: data.task,
        pack_json: pack,
        sha256: packSha,
        gate_status: finalGate,
        gate_reason: gateReason,
        file_count: files.length,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { packId: row.id as string };
  });

export const listPacks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("context_packs")
      .select("id, repo_url, ref, task, sha256, gate_status, file_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { packs: data ?? [] };
  });

export const getPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: pack, error } = await context.supabase
      .from("context_packs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pack) throw new Error("Pack not found");

    const { data: proposals } = await context.supabase
      .from("proposals")
      .select("id, provider, model, valid, error, created_at")
      .eq("pack_id", data.id)
      .order("created_at", { ascending: false });

    const latestProposalId = proposals?.[0]?.id as string | undefined;
    let latestReview: { status: string; notes: string | null } | null = null;
    if (latestProposalId) {
      const { data: r } = await context.supabase
        .from("reviews")
        .select("status, notes")
        .eq("proposal_id", latestProposalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      latestReview = (r as { status: string; notes: string | null } | null) ?? null;
    }

    return { pack, proposals: proposals ?? [], latestReview };
  });

// ─── Repo Inspector ──────────────────────────────────────────────────────────

export type RepoFileKind =
  | "manifest" | "rustSource" | "doc" | "config" | "test"
  | "example" | "comptextConfig" | "ci" | "other";

export type RepoPreview = {
  owner: string;
  repo: string;
  ref: string;
  commitSha: string;
  totals: { totalFiles: number; eligibleFiles: number; eligibleBytes: number };
  buckets: Record<RepoFileKind, number>;
  ineligibleByKind: Record<RepoFileKind, number>;
  detected: {
    isRust: boolean;
    hasCli: boolean;
    hasReadme: boolean;
    hasComptextConfig: boolean;
    hasTests: boolean;
    hasCi: boolean;
  };
  topFiles: { path: string; kind: RepoFileKind; size: number }[];
  truncated: boolean;
};


function classify(path: string): RepoFileKind {
  const p = path.toLowerCase();
  if (p.startsWith(".comptext/") || p === "comptext.toml" || p.endsWith("/comptext.toml")) return "comptextConfig";
  if (p.startsWith(".github/")) return "ci";
  if (p === "cargo.toml" || p.endsWith("/cargo.toml") || p === "package.json" || p === "pyproject.toml") return "manifest";
  if (p.startsWith("examples/")) return "example";
  if (p.startsWith("tests/") || /(^|\/)tests?\//.test(p) || /_test\.[a-z]+$/.test(p)) return "test";
  if (p.endsWith(".rs")) return "rustSource";
  if (p.startsWith("readme") || p.endsWith("/readme.md") || p.endsWith(".md") || p.endsWith(".mdx") || p.startsWith("docs/")) return "doc";
  if (p.endsWith(".toml") || p.endsWith(".yaml") || p.endsWith(".yml") || p.endsWith(".json")) return "config";
  return "other";
}

const PreviewInput = z.object({
  repoUrl: z.string().url(),
  ref: z.string().min(1).max(80).default("main"),
});

export const previewRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PreviewInput.parse(d))
  .handler(async ({ data }) => {
    const parsed = parseGithubUrl(data.repoUrl);
    if (!parsed) throw new Error("Invalid GitHub repository URL");
    const { owner, repo } = parsed;
    const branch = (await gh(
      `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(data.ref)}`,
    )) as { commit: { sha: string; commit: { tree: { sha: string } } } };
    const treeSha = branch.commit.commit.tree.sha;
    const tree = (await gh(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    )) as { tree: GhTreeEntry[]; truncated: boolean };

    const policy = DEFAULT_POLICY;
    const blobs = tree.tree.filter((e) => e.type === "blob");
    const buckets: Record<RepoFileKind, number> = {
      manifest: 0, rustSource: 0, doc: 0, config: 0, test: 0,
      example: 0, comptextConfig: 0, ci: 0, other: 0,
    };
    const ineligibleByKind: Record<RepoFileKind, number> = {
      manifest: 0, rustSource: 0, doc: 0, config: 0, test: 0,
      example: 0, comptextConfig: 0, ci: 0, other: 0,
    };
    let eligibleFiles = 0;
    let eligibleBytes = 0;
    const enriched = blobs.map((e) => {
      const kind = classify(e.path);
      buckets[kind] += 1;
      const inc = shouldInclude(e.path, policy).include && (e.size ?? 0) <= policy.maxFileKb * 1024;
      if (inc) {
        eligibleFiles += 1;
        eligibleBytes += e.size ?? 0;
      } else {
        ineligibleByKind[kind] += 1;
      }
      return { path: e.path, kind, size: e.size ?? 0, eligible: inc };
    });

    const order: Record<RepoFileKind, number> = {
      manifest: 0, comptextConfig: 1, rustSource: 2, doc: 3, config: 4, test: 5, example: 6, ci: 7, other: 8,
    };
    const topFiles = enriched
      .filter((f) => f.eligible)
      .sort((a, b) => order[a.kind] - order[b.kind] || a.path.localeCompare(b.path))
      .slice(0, 25)
      .map(({ path, kind, size }) => ({ path, kind, size }));

    const detected = {
      isRust: buckets.rustSource > 0 || enriched.some((f) => /(^|\/)cargo\.toml$/i.test(f.path)),
      hasCli: enriched.some((f) => /(^|\/)src\/main\.rs$/i.test(f.path) || /(^|\/)src\/bin\//i.test(f.path)),
      hasReadme: enriched.some((f) => /(^|\/)readme(\.|$)/i.test(f.path)),
      hasComptextConfig: buckets.comptextConfig > 0,
      hasTests: buckets.test > 0,
      hasCi: buckets.ci > 0,
    };

    return {
      owner, repo, ref: data.ref, commitSha: branch.commit.sha,
      totals: { totalFiles: blobs.length, eligibleFiles, eligibleBytes },
      buckets, ineligibleByKind, detected, topFiles, truncated: tree.truncated,
    } satisfies RepoPreview;
  });

