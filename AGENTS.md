# AGENTS.md

## Cursor Cloud specific instructions

Space Explorer is a client-only Phaser 4 + TypeScript + Vite browser game. There is no
backend; the only "service" is the Vite dev server. Standard commands live in `README.md`
(Development section), `package.json` scripts, and `docs/qa/quality-gates.md` — use those
rather than duplicating them here.

- Package manager/runtime is **Bun 1.3.5**, installed at `/usr/local/bin/bun` (persisted in
  the base snapshot). All scripts are run through `bun run ...`. `node` and `google-chrome`
  are also preinstalled.
- Dev server: `bun run dev` serves the game at `http://127.0.0.1:5173/`. It is a foreground
  process, so run it in its own terminal (e.g. a tmux session). The Playwright config starts
  its own dev server on port `4173`, independent of the manual `5173` server.
- The game **requires WebGL**; there is no Canvas fallback (unsupported browsers get an
  explicit "WebGL required" screen). Interactive `google-chrome` in this VM has working WebGL,
  so manual play testing at `localhost:5173` works.
- **E2e gotcha:** headless Linux here has no hardware WebGL. Always run Playwright lanes with
  `CI=1` (e.g. `CI=1 bun run test:e2e:smoke`). `CI=1` makes the config launch Chromium with
  SwiftShader software WebGL (`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`)
  and pins one worker; without it the Phaser WebGL tests fail to render. The full
  `test:e2e:fast`/`test:e2e:performance` lanes are slow (~5+ min) under SwiftShader.
- The Playwright Chromium browser is installed in the base snapshot via
  `bunx playwright install --with-deps chromium`. Re-run that only if the `@playwright/test`
  version changes (the update script does not reinstall browsers).
