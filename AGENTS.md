# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Personal website for Jackson Wheeler. Static HTML/CSS/JS served by a tiny,
dependency-free Node server.

- `public/` — the site (`index.html`, `styles/`, `js/`, `media/`)
- `server.js` — zero-dependency static file server (`node:http`)
- `statics/` — legacy site, kept for reference only; not served

## Commands

- `npm start` — serve `public/` on http://localhost:8080 (override with `PORT`)
- `npm run dev` — same, restarting on server changes (`node --watch`)

## Conventions

- No build step and no runtime dependencies. Prefer platform features
  (modern CSS, ES modules, Canvas) over libraries.
- Keep the site fast and readable on mobile first.

## Git workflow

- **Fold small commits before pushing.** Squash fixups, typo fixes, and
  work-in-progress commits into the logical commit they belong to
  (e.g. `git rebase -i` / `git commit --fixup` + `--autosquash`), so each
  pushed commit is a coherent, self-contained change.
- Never rewrite history that has already been pushed to a shared branch
  without asking first.

## TODO

More guidance to be defined.
