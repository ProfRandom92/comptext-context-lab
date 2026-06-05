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

    return { pack, proposals: proposals ?? [] };
  });
