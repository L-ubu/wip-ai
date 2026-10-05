import { readdir, access, readFile } from 'node:fs/promises';
import { join, basename, resolve } from 'node:path';
import { homedir } from 'node:os';
import { repoState } from './git.mjs';

const CONFIG_PATH = join(homedir(), '.config', 'wip-ai', 'config.json');

const DEFAULTS = {
  roots: [join(homedir(), 'Projects')],
  extraRepos: [],
  ignore: ['node_modules'],
  model: 'qwen2.5:7b',
  ai: true,
  max: 10,
};

export async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

async function isGitRepo(dir) {
  try {
    await access(join(dir, '.git'));
    return true;
  } catch {
    return false;
  }
}

/** Discover repos: direct children of each root + explicit extraRepos. */
export async function discoverRepos(config) {
  const found = new Set();

  for (const root of config.roots) {
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
    const dir = resolve(extra.replace(/^~/, homedir()));
    if (await isGitRepo(dir)) found.add(dir);
  }

  return [...found];
}

/** Scan all repos in parallel, return sorted by most recent commit. */
export async function scanRepos(config, { extraRoot } = {}) {
  const roots = extraRoot ? [...config.roots, resolve(extraRoot)] : config.roots;
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
