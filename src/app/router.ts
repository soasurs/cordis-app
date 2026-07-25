import { createRouter } from '@tanstack/react-router'

import { routeTree } from '@/routeTree.gen'

import { queryClient } from '@/app/query-client'

export const router = createRouter({
  context: { queryClient },
  defaultPreload: 'intent',
  routeTree,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
