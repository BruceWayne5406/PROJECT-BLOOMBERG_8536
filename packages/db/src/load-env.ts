import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    try {
      const pkg = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8")) as {
        name?: string;
      };
      if (pkg.name === "scp") return dir;
    } catch {
      // keep walking
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function loadRootEnv() {
  const envPath = resolve(repoRoot(), ".env");
  try {
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq);
      const val = trimmed.slice(eq + 1);
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // .env is optional when DATABASE_URL is already set
  }
  process.env.DATABASE_URL ??= "postgresql://scp:scp@localhost:5432/scp";
}
