import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/dm')({
  component: Outlet,
  validateSearch: () => ({}),
})
