# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. Keep application bootstrap and providers in `src/app`, file-based routes in `src/routes`, domain code in `src/features`, reusable primitives in `src/components/ui`, and global styles in `src/styles`. Connect-RPC setup belongs in `src/api`; business modules must import API capabilities through this layer rather than importing `src/gen` directly. `src/gateway` contains the framework-independent WebSocket client and protocol types, while `src/stores` contains Zustand UI state. Buf-generated files live in `src/gen` and must never be edited manually. Place static assets in `public` and Playwright tests in `e2e`.

## Architecture Boundaries

Use TanStack Router for URL state, TanStack Query for server-authoritative data, and Zustand only for client UI state such as dialogs, drafts, theme, and connection presentation. Keep `GatewayClient` independent of React; adapt READY and domain events into the Query cache at the application layer. Store access tokens in memory and persist only the refresh token in local storage. Development API and `/ws` traffic must use the Vite same-origin proxy.

## Build, Test, and Development Commands

Use pnpm exclusively; do not add npm or Yarn lockfiles.

- `pnpm dev`: start the Vite development server.
- `pnpm typecheck`: run strict TypeScript checking.
- `pnpm lint`: run ESLint.
- `pnpm test:run`: run Vitest once for CI-style verification.
- `pnpm test:e2e`: run Playwright end-to-end tests.
- `pnpm build`: type-check and create the production bundle.
- `pnpm check`: run the complete repository verification pipeline.

API generation is intentionally deferred until a stable Cordis backend tag is available. Once configured, commit regenerated output under `src/gen` together with the tag update.

## Coding Style & Naming Conventions

Use TypeScript in strict mode, two-space indentation, ESLint, and Prettier. Name React components and types with `PascalCase`, functions and variables with `camelCase`, hooks with a `use` prefix, and feature files with descriptive kebab-case names. Avoid `dangerouslySetInnerHTML`; treat messages and other user-provided content as untrusted.

## Testing Guidelines

Use Vitest and React Testing Library for unit and component tests, colocated as `*.test.ts` or `*.test.tsx`. Test Gateway protocol, heartbeat, resume, and reconnect behavior without React. Use Playwright for login, routing, deep-link refresh, messaging, and reconnect flows. Add focused regression coverage for every bug fix.

## Commit & Pull Request Guidelines

Use scoped Conventional Commits, for example `feat(gateway): add resume handling`. Keep commits focused and exclude generated changes unrelated to the update. Pull requests should explain behavior and verification, link relevant issues, identify backend tag changes, and include screenshots for visible UI changes.
