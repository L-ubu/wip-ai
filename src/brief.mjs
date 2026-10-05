// Local-LLM welcome-back brief via Ollama. Fails soft: no Ollama, no problem.

import { relTime } from './render.mjs';

const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';

function buildPrompt(repos) {
  const lines = repos.slice(0, 5).map((r) => {
    const bits = [
      `${r.name} (branch ${r.branch})`,
      `last commit ${relTime(r.lastCommitTs)}: "${r.lastCommitSubject || 'none'}"`,
    ];
    if (r.dirtyCount) bits.push(`${r.dirtyCount} uncommitted files (${r.dirtyFiles.slice(0, 3).join(', ')})`);
    if (r.unpushed) bits.push(`${r.unpushed} unpushed commits`);
    if (r.stashes) bits.push(`${r.stashes} stashes`);
    return '- ' + bits.join('; ');
  });

  return `You are a concise dev assistant. A developer with many side projects just asked "what was I doing?".
Given their most recently active git repos below, write a short welcome-back brief:
1) one line on what they were most recently doing (the FIRST repo is the most recent),
2) one line on exactly where to pick up (name the repo, and a file only if listed above),
3) one suggested concrete next step.
Use ONLY the information given; never invent file names or repos.
Plain text, max 3 short lines total, no markdown, no bullet symbols, no fluff.

Repos (most recent first):
${lines.join('\n')}`;
}

/** Returns the brief text, or null if Ollama is unreachable/slow. */
export async function generateBrief(repos, model, { timeoutMs = 25000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: buildPrompt(repos), stream: false }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.response || '').trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
