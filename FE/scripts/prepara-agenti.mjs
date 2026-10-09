import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const root = git("rev-parse", "--show-toplevel");
const directory = path.join(root, "FE", ".worktrees");
mkdirSync(directory, { recursive: true });
try {
  git("check-ignore", path.join(directory, "probe"));
} catch {
  throw new Error("Aggiungere .worktrees/ a FE/.gitignore prima di continuare");
}
const base = git("rev-parse", "HEAD");
for (const level of ["facile", "medio", "difficile"]) {
  const target = path.join(directory, `bot-${level}`);
  if (existsSync(target)) {
    console.log(`Esiste già: ${target}`);
    continue;
  }
  console.log(git("worktree", "add", "-b", `bot-${level}`, target, base));
  console.log(
    `Agente bot-${level}: ${target}/FE; unico file FE/src/giochi/biliardo/bot/${level}.ts`,
  );
}
