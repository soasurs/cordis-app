import { expect, test } from '@playwright/test'

test('shows the Cordis application shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('navigation', { name: 'Spaces' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'general' })).toBeVisible()
  await expect(page.getByText('This is where the conversation begins.')).toBeVisible()
})
