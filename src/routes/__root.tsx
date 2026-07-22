import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <main className="grid min-h-svh place-items-center bg-slate-950 px-6 text-slate-100">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">404</p>
        <h1 className="mt-3 text-2xl font-semibold">This space does not exist.</h1>
      </div>
    </main>
  ),
})
