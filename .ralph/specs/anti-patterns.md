# Anti-Patterns — Read This First Every Loop

These are mistakes Ralph has made on previous projects. Do not repeat them.

## Iteration Discipline
- STRICTLY ONE task per iteration. NEVER combine multiple changes into one commit.
- If you notice another issue while working, log it in .ralph/progress.txt and move on. Do NOT fix it.
- Each commit = exactly ONE logical change. "Fix X and Y" is WRONG. "Fix X" is correct.
- If a task is bigger than expected, implement what you can, set it to "done", and create a note in progress.txt about remaining work. Do NOT leave it "in_progress" forever — this causes infinite loops.

## Concurrent Editing
- A human developer may be editing files at the same time as you. ALWAYS re-read a file before modifying it — never assume it hasn't changed since you last read it.
- Before editing prd.json or progress.txt, read the current version first. Another process may have updated it.
- Use `git pull` or check `git status` before committing if you suspect concurrent changes.

## Context Management
- Do NOT read every file in the project — only read files relevant to the current task.
- Read the relevant spec file ONCE, then work from memory.
- Do NOT explore the entire directory tree. Only look at what you need.
- Minimize context window usage — you degrade when the window fills up.

## Build & Validation
- NEVER commit code that doesn't pass ALL backpressure commands (prisma validate, tsc --noEmit, npm test).
- `npx next build` passing does NOT mean the app works at runtime — TypeScript can't catch data shape issues.
- After creating API routes, curl them to verify they return expected responses.
- When changing imports or moving files, verify build passes — macOS is case-insensitive but the Linux server is case-sensitive.

## Code Quality
- NEVER use dynamic `require()` inside route handlers — use top-level ES imports.
- NEVER use `any` type — define proper types in src/types/.
- FULL implementations only. No placeholders. No stubs. No TODOs.
- Search the codebase before implementing — don't assume something doesn't exist.
- NEVER put magic numbers or hardcoded strings inline — use named constants.
- NEVER duplicate logic — search for existing utilities/hooks/components first.

## MUI / Theming
- NEVER use hardcoded hex colors in components (e.g. `color: "#fff"`, `background: "#1e1e1e"`).
- ALWAYS use MUI theme tokens: `text.primary`, `text.secondary`, `background.default`, `background.paper`, `divider`, `primary.main`, `action.hover`.
- For colors that differ between modes, use `theme.palette.mode === 'dark' ? darkValue : lightValue`.
- Test components in BOTH dark and light mode mentally before committing.

## React Patterns
- Props that seed useState only run once — if the prop changes, state won't update. Use useEffect to sync.
- NEVER create new object/array references inside useEffect dependencies — use useMemo/useCallback.
- NEVER call setState inside useEffect without proper dependency guards — causes infinite re-renders.

## Database / Prisma
- After changing the Prisma schema, ALWAYS run `npx prisma migrate dev` before testing.
- SQLite doesn't support enums — use String fields with application-level validation.
- Always verify cascade deletes work as expected — test by deleting a parent and checking children are gone.

## Socket.io
- Socket.io event names are strings — typos cause silent failures. Always reference the types in src/types/socket.ts.
- On the server, always verify the user's JWT before processing any socket event — don't trust the client.
- When broadcasting to a room, use `socket.to(room)` (excludes sender) vs `io.to(room)` (includes sender). Pick the right one.

## Deployment
- NEVER modify deploy_webhook.sh or server.js webhook handler unless the task specifically requires it.
- NEVER run `node server.js` locally as a background process — it gets stuck and blocks the iteration.
- This app deploys to a REMOTE server. After pushing, the webhook auto-deploys.
- A curl returning 200 does NOT mean the site works — always verify more than just status code.

## Security — Secrets and Sensitive Data
- NEVER hardcode IP addresses, API keys, secrets, tokens, or passwords in any committed file.
- ALL secrets go in `.env` (gitignored). Reference them via `process.env.VARIABLE_NAME`.
- Server connection details live in `.ralph/.server-env` (gitignored). Never copy them into other files.
- When creating example configs, use placeholders: `<random-secret>`, `<your-api-key>`, etc.
- NEVER log secrets to console, progress.txt, or commit messages.
- Before committing, mentally verify: does this diff contain any IPs, keys, passwords, or tokens? If yes, move them to .env.
- The `.env.example` file should ONLY contain placeholder values, never real secrets.
- NEVER commit `.env` files. Verify `.gitignore` includes `.env` before every commit that touches env vars.

## File Handling
- ALWAYS read prd.json before editing it — parse the JSON, modify the specific task, write it back. Do NOT rewrite the entire file from memory.
- When appending to progress.txt, APPEND only — do not rewrite existing content.
- Do NOT modify spec files unless explicitly told to by the human.

## Project Initialization
- NEVER use `create-next-app` or `npx create-*` — these commands hang in non-interactive mode when the directory isn't empty.
- Instead, manually create package.json, tsconfig.json, next.config.js, then run `npm install`.
- Same applies to any interactive scaffolding tool — always create files manually.
