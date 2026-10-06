# wip-ai

> What was I doing? One command restores your context across all your git repos, with a local-LLM welcome-back brief.

You have 20+ repos. It's Monday morning (or Friday after a meeting marathon, or back from lunch). You open your terminal and think: *what was I actually in the middle of?*

`wip` answers that in one glance. And if you have [Ollama](https://ollama.com) running, a local LLM writes you a 3-line welcome-back brief. No API keys, no cloud, no cost.

```
  ▟ wip · what was I doing? (19 repos scanned)

  REPO               LAST COMMIT  BRANCH  STATE
  ● wip-ai           just now     main    ✎4        "feat: ollama brief"
  ● Terminup         2d ago       master  ✎7 ↑2     "tup: slime codex"
  ● jlr_mss          3d ago       feat..  ✎2        "fix: vat nullable"
  ◐ flipper-portals  2w ago       main              "eu portals batch 2"
  … and 15 more (wip --all)

  ▸ pick up where you left off: wip-ai (~/Projects/wip-ai)
    uncommitted: bin/wip-ai.mjs, src/brief.mjs, README.md
    last commit: "feat: ollama brief" on main

  🤖 welcome-back brief (ollama qwen2.5:7b)
  You were mid-way through the wip-ai Ollama integration.
  Pick up in src/brief.mjs, the prompt still needs tuning.
  Commit the working scanner before context-switching.
```

## Why

- **Context switching is expensive.** Especially with ADD, especially with many side projects. `wip` is the save-state loader for your brain.
- **Local-first.** The brief runs on your own Ollama model. Your repo names and commit messages never leave your machine.
- **Zero dependencies.** Plain Node ≥18 + git. Nothing to audit, nothing to break.

## Install

```bash
git clone https://github.com/L-ubu/wip-ai.git
cd wip-ai
npm link        # gives you `wip` and `wip-ai` globally
```

Or run without installing: `node bin/wip-ai.mjs`

## Usage

```bash
wip                 # scan repos, recent activity + AI brief
wip --all           # every repo, not just the top 10
wip --no-ai         # skip the Ollama brief (faster)
wip --json          # machine-readable output
wip --days 7        # only repos active in the last week
wip --model llama3.2  # different Ollama model for the brief
wip --path ~/work   # one-off extra repo or folder of repos
```

By default wip auto-detects these folders in your home directory when they exist: `Projects`, `projects`, `Sites`, `sites`, `dev`, `code`, `repos`, `work`. Set `roots` in the config to override.

## Legend

| Symbol | Meaning |
| ------ | ------- |
| ● green | active today / uncommitted work |
| ● yellow | quiet for a couple of weeks |
| ● red | stale: revive it or archive it |
| `✎n` | n uncommitted files |
| `↑n` | n unpushed commits |
| `⚑n` | n stashes |

## Config

Optional, at `~/.config/wip-ai/config.json`:

```json
{
  "roots": ["~/Projects", "~/sites"],
  "extraRepos": ["~/cursor-cost", "~/dotfiles"],
  "ignore": ["node_modules"],
  "model": "qwen2.5:7b",
  "ai": true,
  "max": 10
}
```

- **roots**: folders of repos to scan (`~` works). Default: auto-detected common folders
- **extraRepos**: specific repos living outside your roots
- **model**: any Ollama model you have pulled (`llama3.2` is faster, `qwen2.5:7b` follows instructions better)
- **ai**: master switch for the brief (auto-skips if Ollama isn't running)

## How it works

1. Discovers repos by scanning your roots one level deep for `.git` dirs
2. Collects branch, last commit, dirty files, unpushed count, stashes, all in parallel, ~1s for 70 repos
3. Sorts by most recent activity and renders the table
4. Optionally sends the top 5 summaries to Ollama for the welcome-back brief

No Ollama? Everything except the brief works fine.

## License

MIT · [L-ubu](https://github.com/L-ubu)
