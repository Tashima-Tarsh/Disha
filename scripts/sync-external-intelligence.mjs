import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.join(repoRoot, ".disha", "external-intelligence");
const statusPath = path.join(runtimeRoot, "status.json");
const statusOnly = process.argv.includes("--status");

const repositories = [
  { id: "nousresearch", url: "https://github.com/Tashima-Tarsh/NousResearch.git", nameWithOwner: "Tashima-Tarsh/NousResearch", license: "MIT" },
  { id: "anthropic", url: "https://github.com/Tashima-Tarsh/Anthropic.git", nameWithOwner: "Tashima-Tarsh/Anthropic", license: "[VERIFY REQUIRED]" },
  { id: "cyber-intelligence-platform", url: "https://github.com/Tashima-Tarsh/cyber-intelligence-platform.git", nameWithOwner: "Tashima-Tarsh/cyber-intelligence-platform", license: "MIT" },
  { id: "pentagi", url: "https://github.com/Tashima-Tarsh/Pentagi.git", nameWithOwner: "Tashima-Tarsh/Pentagi", license: "MIT", defensiveLabOnly: true },
  { id: "osint-analyser", url: "https://github.com/Tashima-Tarsh/osint-analyser.git", nameWithOwner: "Tashima-Tarsh/osint-analyser", license: "[VERIFY REQUIRED]" },
];

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: options.quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  }).trim();
}

function safeGit(args, cwd) {
  try {
    return git(args, { cwd, quiet: true });
  } catch (error) {
    return "";
  }
}

mkdirSync(runtimeRoot, { recursive: true });

const statuses = repositories.map((repo) => {
  const target = path.join(runtimeRoot, repo.id);
  const present = existsSync(path.join(target, ".git"));

  if (!statusOnly && !present) {
    git(["clone", "--depth", "1", repo.url, target]);
  } else if (!statusOnly && present) {
    git(["pull", "--ff-only"], { cwd: target });
  }

  const existsAfter = existsSync(path.join(target, ".git"));
  const branch = existsAfter ? safeGit(["rev-parse", "--abbrev-ref", "HEAD"], target) : "";
  const commit = existsAfter ? safeGit(["rev-parse", "HEAD"], target) : "";
  const remote = existsAfter ? safeGit(["remote", "get-url", "origin"], target) : "";
  const topLevelFiles = existsAfter ? safeGit(["ls-tree", "--name-only", "-r", "HEAD"], target).split("\n").filter(Boolean).slice(0, 80) : [];

  return {
    id: repo.id,
    nameWithOwner: repo.nameWithOwner,
    url: repo.url.replace(/\.git$/, ""),
    localPath: path.relative(repoRoot, target).replaceAll("\\", "/"),
    license: repo.license,
    defensiveLabOnly: Boolean(repo.defensiveLabOnly),
    present: existsAfter,
    branch,
    commit,
    remote,
    topLevelFiles,
    syncedAt: new Date().toISOString(),
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  runtimeRoot: path.relative(repoRoot, runtimeRoot).replaceAll("\\", "/"),
  rule: "Exact external repositories are pulled into local DISHA runtime. They are not vendored into source control.",
  repositories: statuses,
};

writeFileSync(statusPath, `${JSON.stringify(payload, null, 2)}\n`);

if (statusOnly && existsSync(statusPath)) {
  console.log(readFileSync(statusPath, "utf8"));
} else {
  console.log(JSON.stringify(payload, null, 2));
}
