// Pure, client-safe policy + utility helpers. No server-only imports.

export type Policy = {
  allowGlobs: string[];
  denyGlobs: string[];
  maxFileKb: number;
  maxFiles: number;
};

export const DEFAULT_POLICY: Policy = {
  allowGlobs: [
    "**/*.md", "**/*.mdx", "**/*.txt", "**/*.json", "**/*.toml", "**/*.yaml", "**/*.yml",
    "**/*.rs", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx",
    "**/*.py", "**/*.go", "**/*.rb", "**/*.java", "**/*.kt", "**/*.swift",
    "**/*.c", "**/*.h", "**/*.cpp", "**/*.cs",
    "**/Cargo.toml", "**/Cargo.lock", "**/package.json", "**/README*",
  ],
  denyGlobs: [
    "**/.git/**", "**/node_modules/**", "**/target/**", "**/dist/**", "**/build/**",
    "**/.env*", "**/secrets/**", "**/*.pem", "**/*.key", "**/*.p12",
    "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.gif", "**/*.webp", "**/*.ico",
    "**/*.lock",
  ],
  maxFileKb: 64,
  maxFiles: 60,
};

function globToRegex(glob: string): RegExp {
  // Minimal glob: **, *, ? — anchored
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i++;
      if (glob[i + 1] === "/") i++;
    } else if (c === "*") {
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^$(){}|[]\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  re += "$";
  return new RegExp(re);
}

export function matchAny(path: string, globs: string[]): boolean {
  return globs.some((g) => globToRegex(g).test(path));
}

export function shouldInclude(path: string, policy: Policy): { include: boolean; reason?: string } {
  if (matchAny(path, policy.denyGlobs)) return { include: false, reason: "deny-glob" };
  if (!matchAny(path, policy.allowGlobs)) return { include: false, reason: "not-allowed" };
  return { include: true };
}

// Heuristic for accidental secrets in file contents
const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: "OpenAI key", re: /sk-[A-Za-z0-9]{20,}/ },
  { name: "Generic bearer", re: /Bearer\s+[A-Za-z0-9._\-]{20,}/ },
];

export function scanSecrets(content: string): string[] {
  const hits: string[] = [];
  for (const p of SECRET_PATTERNS) if (p.re.test(content)) hits.push(p.name);
  return hits;
}

export function parseGithubUrl(input: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(input.trim());
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

// Deterministic JSON serialize with sorted keys
export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v as object)) throw new Error("cycle");
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = walk((v as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value), null, 2);
}
