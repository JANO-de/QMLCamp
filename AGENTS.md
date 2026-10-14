# AGENTS.md — working notes for this repo

## Output style
- When writing a file the user cannot see from here, print **only a visual progress bar** until the file is finished (no code dumps, no running commentary).
  - Helper: `bash /tmp/opencode/rust/bar.sh <pct> "message"`.
- Keep replies terse; answer in the language of the last message; give ready-to-run commands in a single block; ask at most one question; never claim something ran unless it actually ran.

## Project
- QMLCamp: offline course site, vanilla JS, no build step, no CDN. Repo `github.com/JANO-de/QMLCamp`, branch `main`.
- Courses: QML (`content/m1..m8.js`), JavaScript (`content/js1.js`), Rust (`content/rust1.js`).
- `HANDOFF.md` holds the approved TODO list; mark items `[x]` and ask before changing the list.

## Verification
- Every lab starter must fail and every solution must pass via `#/verify`.
- Headless check: Chromium at `/nix/store/d7gmjb7cxfhkrjzml53ncja1li0amhc2-chromium-155.0.8059.39/bin/chromium` (set `CHROME`), Playwright from `/tmp/opencode/verify`, `PLAYWRIGHT_BROWSERS_PATH=/nix/store/9gqkmc8z1xf6ipfws7sljq8jl0z8slnc-playwright-driver-browsers-1.53.2`.
