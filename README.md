# Cordis App

Cordis App is the browser client for Cordis. It is a strict TypeScript React SPA built with
Vite, TanStack Router, TanStack Query, Tailwind CSS, and Radix UI primitives.

## Development

```bash
pnpm install
pnpm dev
```

Run `pnpm check` before opening a pull request. The public API generation pipeline will be
pinned to Cordis `v0.1.0`. Regenerate the checked-in TypeScript descriptors after changing
the pinned backend tag:

```bash
pnpm generate
```
