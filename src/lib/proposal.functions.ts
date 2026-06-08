import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type PackRow = {
  id: string;
  repo_url: string;
  ref: string;
  task: string;
  gate_status: string;
  pack_json: {
    files: { path: string; preview: string }[];
    stats: { fileCount: number; totalBytes: number };
  };
};

const PROPOSAL_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    plan: { type: "array", items: { type: "string" } },
    affected_files: { type: "array", items: { type: "string" } },
    diffs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          rationale: { type: "string" },
          patch: { type: "string" },
        },
        required: ["path", "rationale", "patch"],
        additionalProperties: false,
      },
    },
    risks: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "plan", "affected_files", "diffs", "risks"],
  additionalProperties: false,
} as const;

const AskInput = z.object({
  packId: z.string().uuid(),
  provider: z.enum(["lovable-ai", "dummy"]).default("lovable-ai"),
});

export const askProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AskInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: pack, error: pErr } = await context.supabase
      .from("context_packs")
      .select("id, repo_url, ref, task, gate_status, pack_json")
      .eq("id", data.packId)
      .maybeSingle<PackRow>();
    if (pErr) { console.error("[db:load pack for proposal]", pErr.message); throw new Error("A database error occurred. Please try again."); }
    if (!pack) throw new Error("Pack not found");
    if (pack.gate_status !== "pass") throw new Error("Policy gate did not pass");

    const model = "google/gemini-3-flash-preview";

    if (data.provider === "dummy") {
      const dummy = {
        summary: `Dry-run: would address task "${pack.task}" against ${pack.repo_url}@${pack.ref}.`,
        plan: ["Inspect repository structure", "Identify target files", "Draft minimal change", "Validate locally"],
        affected_files: pack.pack_json.files.slice(0, 3).map((f) => f.path),
        diffs: [],
        risks: ["Dummy provider — no real model output"],
      };
      const { data: row, error } = await context.supabase
        .from("proposals")
        .insert({
          user_id: context.userId,
          pack_id: pack.id,
          provider: "dummy",
          model: "dummy",
          response_json: dummy,
          valid: true,
        })
        .select("id")
        .single();
      if (error) { console.error("[db:insert dummy proposal]", error.message); throw new Error("A database error occurred. Please try again."); }
      return { proposalId: row.id as string };
    }

    // Trim file previews for context budget
    const filesForPrompt = pack.pack_json.files.map((f) => ({
      path: f.path,
      preview: f.preview.slice(0, 2400),
    }));

    const messages = [
      {
        role: "system",
        content:
          "You are CompText, a proposal-gated AI engineer. You receive a deterministic Context Pack (repo files + a task) and respond with a STRUCTURED proposal — never apply changes. Be concise, conservative, and honest about uncertainty. Output must match the provided JSON schema exactly.",
      },
      {
        role: "user",
        content: `Repository: ${pack.repo_url}@${pack.ref}\nTask: ${pack.task}\n\nContext Pack files (${filesForPrompt.length}):\n\n` +
          filesForPrompt
            .map((f) => `--- ${f.path} ---\n${f.preview}`)
            .join("\n\n"),
      },
    ];

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "submit_proposal",
                description: "Submit a structured proposal artifact for review.",
                parameters: PROPOSAL_SCHEMA,
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_proposal" } },
        }),
      });
    } catch (e) {
      throw new Error(`Provider network error: ${(e as Error).message}`);
    }

    if (response.status === 429) throw new Error("Rate limit exceeded. Please retry shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
    if (!response.ok) {
      const t = await response.text();
      throw new Error(`Provider error ${response.status}: ${t.slice(0, 240)}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const argStr = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: unknown = null;
    let valid = false;
    let errorText: string | null = null;
    try {
      parsed = argStr ? JSON.parse(argStr) : null;
      valid = !!parsed;
    } catch (e) {
      errorText = `Invalid JSON from provider: ${(e as Error).message}`;
    }

    const { data: row, error } = await context.supabase
      .from("proposals")
      .insert({
        user_id: context.userId,
        pack_id: pack.id,
        provider: "lovable-ai",
        model,
        response_json: parsed as never,
        valid,
        error: errorText,
      })
      .select("id")
      .single();
    if (error) { console.error("[db:insert proposal]", error.message); throw new Error("A database error occurred. Please try again."); }
    return { proposalId: row.id as string };
  });

export const getProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: proposal, error } = await context.supabase
      .from("proposals")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) { console.error("[db:load proposal]", error.message); throw new Error("A database error occurred. Please try again."); }
    if (!proposal) throw new Error("Proposal not found");

    const { data: review } = await context.supabase
      .from("reviews")
      .select("*")
      .eq("proposal_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { proposal, review };
  });

const ReviewInput = z.object({
  proposalId: z.string().uuid(),
  status: z.enum(["pass", "notes", "blocked"]),
  notes: z.string().max(2000).optional(),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reviews").insert({
      user_id: context.userId,
      proposal_id: data.proposalId,
      status: data.status,
      notes: data.notes ?? null,
    });
    if (error) { console.error("[db:insert review]", error.message); throw new Error("A database error occurred. Please try again."); }
    return { ok: true };
  });

export const listArtifacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: packs } = await context.supabase
      .from("context_packs")
      .select("id, repo_url, ref, task, gate_status, file_count, sha256, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const { data: proposals } = await context.supabase
      .from("proposals")
      .select("id, pack_id, provider, model, valid, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const { data: reviews } = await context.supabase
      .from("reviews")
      .select("id, proposal_id, status, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return { packs: packs ?? [], proposals: proposals ?? [], reviews: reviews ?? [] };
  });
