import { readdir, access, readFile, realpath } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { homedir } from 'node:os';
import { repoState } from './git.mjs';

const CONFIG_PATH = join(homedir(), '.config', 'wip-ai', 'config.json');

// Scanned by default when they exist (config.roots overrides this list).
const CANDIDATE_ROOTS = ['Projects', 'projects', 'Sites', 'sites', 'dev', 'code', 'repos', 'work'];

const DEFAULTS = {
  roots: null, // null = auto-detect from CANDIDATE_ROOTS
  extraRepos: [],
  ignore: ['node_modules'],
  model: 'qwen2.5:7b',
  ai: true,
  max: 10,
};

const expandHome = (p) => resolve(p.replace(/^~/, homedir()));

export async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

async function detectRoots() {
  const out = [];
  for (const name of CANDIDATE_ROOTS) {
    const dir = join(homedir(), name);
    try {
      await access(dir);
      out.push(dir);
    } catch {
      // doesn't exist, skip
    }
  }
  return out;
}

async function isGitRepo(dir) {
  try {
    await access(join(dir, '.git'));
    return true;
  } catch {
    return false;
  }
}

/** Discover repos: each root itself (if it is a repo) + its direct children + explicit extraRepos. */
export async function discoverRepos(config) {
  const found = new Set();

  for (const root of config.roots) {
    if (await isGitRepo(root)) {
      found.add(root);
      continue;
    }
    let entries = [];
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.') || config.ignore.includes(e.name)) continue;
      const dir = join(root, e.name);
      if (await isGitRepo(dir)) found.add(dir);
    }
  }

  for (const extra of config.extraRepos) {
    const dir = expandHome(extra);
    if (await isGitRepo(dir)) found.add(dir);
  }

  // Dedupe by real path (macOS case-insensitive FS: ~/Projects == ~/projects)
  const seen = new Map();
  for (const d of found) {
    let key = d;
    try {
      key = await realpath(d);
    } catch {
      // keep original
    }
    const k = key.toLowerCase();
    if (!seen.has(k)) seen.set(k, d);
  }
  return [...seen.values()];
}

/** Scan all repos in parallel, return sorted by most recent commit. */
export async function scanRepos(config, { extraRoot } = {}) {
  let roots = config.roots ? config.roots.map(expandHome) : await detectRoots();
  if (extraRoot) roots = [...roots, expandHome(extraRoot)];
  const dirs = await discoverRepos({ ...config, roots });

  const repos = await Promise.all(
    dirs.map(async (dir) => {
      const state = await repoState(dir);
      return { name: basename(dir), path: dir, ...state };
    })
  );

  // Most recent activity first; repos with no commits sink to the bottom
  repos.sort((a, b) => (b.lastCommitTs || 0) - (a.lastCommitTs || 0));
  return repos;
}
