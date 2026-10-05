#!/usr/bin/env node
// wip-ai — what was I doing? Context restore across all your git repos.

import { loadConfig, scanRepos } from '../src/scan.mjs';
import { generateBrief } from '../src/brief.mjs';
import { renderHeader, renderTable, renderPickup, renderBrief, renderFooter, c } from '../src/render.mjs';

const VERSION = '1.0.0';

const HELP = `
  wip-ai — what was I doing?

  Usage
    wip                 scan repos, show recent activity + AI brief
    wip --all           show every repo, not just the top 10
    wip --no-ai         skip the Ollama welcome-back brief
    wip --json          machine-readable output
    wip --days <n>      only repos active in the last n days
    wip --model <m>     Ollama model for the brief (default: qwen2.5:7b)
    wip --path <dir>    add an extra directory to scan (one-off)
    wip --version       print version
    wip --help          this help

  Config (~/.config/wip-ai/config.json)
    {
      "roots": ["~/Projects"],        directories whose children are scanned
      "extraRepos": ["~/cursor-cost"], repos outside your roots
      "ignore": ["node_modules"],     directory names to skip
      "model": "qwen2.5:7b",          Ollama model
      "ai": true,                     master switch for the brief
      "max": 10                       rows shown by default
    }

  Legend
    ● green  active today / uncommitted work
    ● yellow quiet for a couple of weeks
    ● red    stale — maybe revive or archive
    ✎n uncommitted files   ↑n unpushed commits   ⚑n stashes
`;

function parseArgs(argv) {
  const opts = { all: false, ai: null, json: false, days: null, model: null, path: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--all': opts.all = true; break;
      case '--no-ai': opts.ai = false; break;
      case '--json': opts.json = true; break;
      case '--days': opts.days = Number(argv[++i]); break;
      case '--model': opts.model = argv[++i]; break;
      case '--path': opts.path = argv[++i]; break;
      case '--version': case '-v': console.log(VERSION); process.exit(0);
      case '--help': case '-h': console.log(HELP); process.exit(0);
      default:
        if (a.startsWith('--')) {
          console.error(`unknown flag: ${a} (try wip --help)`);
          process.exit(1);
        }
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const config = await loadConfig();
const model = opts.model || config.model;
const wantAi = (opts.ai ?? config.ai) && !opts.json;

let repos = await scanRepos(config, { extraRoot: opts.path });

if (opts.days !== null) {
  const cutoff = Date.now() / 1000 - opts.days * 86400;
  repos = repos.filter((r) => (r.lastCommitTs || 0) >= cutoff);
}

if (opts.json) {
  console.log(JSON.stringify({ scannedAt: new Date().toISOString(), repos }, null, 2));
  process.exit(0);
}

if (!repos.length) {
  console.log('\n  no git repos found — check your roots in ~/.config/wip-ai/config.json\n');
  process.exit(0);
}

process.stdout.write(renderHeader(repos.length));
process.stdout.write(renderTable(repos, { max: opts.all ? repos.length : config.max }));
process.stdout.write(renderPickup(repos[0]));

if (wantAi) {
  const brief = await generateBrief(repos, model);
  if (brief) {
    process.stdout.write(renderBrief(brief, model));
  } else {
    process.stdout.write('\n' + c.dim + '  (ollama not reachable — skipping brief. run `ollama serve` or use --no-ai)' + c.reset);
  }
}

process.stdout.write(renderFooter());
