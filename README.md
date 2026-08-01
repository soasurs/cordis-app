# Cordis App

Cordis App is the browser client for Cordis. It is a strict TypeScript React SPA built with
Vite, TanStack Router, TanStack Query, Tailwind CSS, and Radix UI primitives.

## Development

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and set the build-time Gateway WebSocket URL for your
environment. The URL must use `ws` or `wss` and contain only the Gateway host, without a path.

Run `pnpm check` before opening a pull request. The public API generation pipeline is pinned
to Cordis commit `eb390204adbdaeb888a3b373a1006d661bb5b8f6` in `buf.gen.yaml`. Regenerate the checked-in TypeScript descriptors
after changing the pinned backend ref:

```bash
pnpm generate
```
