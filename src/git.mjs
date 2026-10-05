import { execFile } from 'node:child_process';

const TIMEOUT = 5000;

/** Run a git command in a repo, return trimmed stdout or null on failure. */
export function git(cwd, args) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: TIMEOUT, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.trim());
    });
  });
}

/** Collect the full state of one repo. Never throws; missing data becomes null. */
export async function repoState(dir) {
  const [branch, lastRaw, statusRaw, unpushedRaw, stashRaw] = await Promise.all([
    git(dir, ['branch', '--show-current']),
    git(dir, ['log', '-1', '--format=%ct%x1f%s%x1f%cr']),
    git(dir, ['status', '--porcelain']),
    git(dir, ['rev-list', '--count', '@{upstream}..HEAD']),
    git(dir, ['stash', 'list']),
  ]);

  // Detached HEAD fallback
  let ref = branch;
  if (!ref) ref = await git(dir, ['rev-parse', '--short', 'HEAD']);

  const dirtyFiles = statusRaw ? statusRaw.split('\n').filter(Boolean) : [];
  const [ts, subject, rel] = lastRaw ? lastRaw.split('\x1f') : [null, null, null];

  return {
    branch: ref || '?',
    lastCommitTs: ts ? Number(ts) : null,
    lastCommitSubject: subject || null,
    lastCommitRel: rel || null,
    dirtyCount: dirtyFiles.length,
    dirtyFiles: dirtyFiles.map((l) => l.slice(3)),
    unpushed: unpushedRaw !== null ? Number(unpushedRaw) : null,
    stashes: stashRaw ? stashRaw.split('\n').filter(Boolean).length : 0,
  };
}
