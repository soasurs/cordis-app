import { createFileRoute } from '@tanstack/react-router'

import { DesignLab } from '@/features/design-lab/design-lab'

export const Route = createFileRoute('/_design')({
  component: DesignLab,
})
