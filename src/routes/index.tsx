import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '../components/layout/app-shell'

export const Route = createFileRoute('/')({
  component: AppShell,
})
