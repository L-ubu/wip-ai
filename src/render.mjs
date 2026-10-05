// Terminal rendering — hand-rolled ANSI, zero deps.

const ESC = '\x1b[';
export const c = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  pink: `${ESC}38;2;244;114;182m`, // #f472b6 — wip-ai accent
  green: `${ESC}38;2;74;222;128m`,
  yellow: `${ESC}38;2;250;204;21m`,
  red: `${ESC}38;2;248;113;113m`,
  cyan: `${ESC}38;2;34;211;238m`,
  gray: `${ESC}38;2;107;114;128m`,
};

const paint = (color, s) => `${color}${s}${c.reset}`;

export function relTime(ts) {
  if (!ts) return 'no commits';
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function badges(repo) {
  const out = [];
  if (repo.dirtyCount > 0) out.push(paint(c.yellow, `✎${repo.dirtyCount}`));
  if (repo.unpushed > 0) out.push(paint(c.cyan, `↑${repo.unpushed}`));
  if (repo.stashes > 0) out.push(paint(c.gray, `⚑${repo.stashes}`));
  if (repo.unpushed === null) out.push(paint(c.gray, 'no-remote'));
  return out.join(' ');
}

function statusDot(repo) {
  const ageDays = repo.lastCommitTs ? (Date.now() / 1000 - repo.lastCommitTs) / 86400 : Infinity;
  if (repo.dirtyCount > 0 || ageDays <= 1) return paint(c.green, '●');
  if (ageDays <= 14) return paint(c.yellow, '●');
  return paint(c.red, '●');
}

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

export function renderTable(repos, { max }) {
  const shown = repos.slice(0, max);
  const nameW = Math.min(Math.max(...shown.map((r) => r.name.length), 4), 28);
  const branchW = Math.min(Math.max(...shown.map((r) => r.branch.length), 6), 24);

  const lines = [];
  lines.push('');
  lines.push(
    paint(c.dim, `  ${'REPO'.padEnd(nameW)}  ${'LAST COMMIT'.padEnd(11)}  ${'BRANCH'.padEnd(branchW)}  STATE`)
  );
  for (const r of shown) {
    const name = paint(c.bold, truncate(r.name, nameW).padEnd(nameW));
    const time = paint(c.gray, relTime(r.lastCommitTs).padEnd(11));
    const branch = paint(c.pink, truncate(r.branch, branchW).padEnd(branchW));
    const subject = r.lastCommitSubject ? paint(c.dim, `  "${truncate(r.lastCommitSubject, 42)}"`) : '';
    lines.push(`  ${statusDot(r)} ${name}  ${time}  ${branch}  ${badges(r)}${subject}`);
  }
  if (repos.length > max) {
    lines.push(paint(c.dim, `  … and ${repos.length - max} more (wip --all)`));
  }
  return lines.join('\n');
}

export function renderPickup(repo) {
  if (!repo) return '';
  const lines = [];
  lines.push('');
  lines.push(paint(c.pink, `  ▸ pick up where you left off — `) + paint(c.bold, repo.name) + paint(c.dim, ` (${repo.path})`));
  if (repo.dirtyFiles.length) {
    const files = repo.dirtyFiles.slice(0, 5).join(', ');
    const more = repo.dirtyFiles.length > 5 ? ` +${repo.dirtyFiles.length - 5} more` : '';
    lines.push(paint(c.yellow, `    uncommitted: `) + paint(c.dim, truncate(files + more, 90)));
  }
  if (repo.lastCommitSubject) {
    lines.push(paint(c.gray, `    last commit: "${truncate(repo.lastCommitSubject, 70)}" on ${repo.branch}`));
  }
  return lines.join('\n');
}

export function renderHeader(count) {
  return (
    '\n' +
    paint(c.pink + c.bold, '  ▟ wip') +
    paint(c.dim, ` — what was I doing? (${count} repos scanned)`)
  );
}

export function renderBrief(text, model) {
  const lines = [];
  lines.push('');
  lines.push(paint(c.cyan, `  🤖 welcome-back brief`) + paint(c.dim, ` (ollama ${model})`));
  for (const line of text.split('\n').filter(Boolean)) {
    lines.push(paint(c.reset, `  ${line}`));
  }
  return lines.join('\n');
}

export function renderFooter() {
  return '\n' + paint(c.dim, '  flags: --all · --no-ai · --json · --days <n> · --model <m> · --help') + '\n';
}
