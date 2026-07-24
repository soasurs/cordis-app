import { expect, test } from '@playwright/test'

test('protects the Cordis application shell', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Sign in to Cordis' })).toBeVisible()
})

test('navigates between the authentication pages', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Sign in to Cordis' })).toBeVisible()
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL('/forgot-password')
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to sign in' }).click()
  await expect(page).toHaveURL('/login')

  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL('/register')
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()

  await page.getByRole('link', { name: 'Back to sign in' }).click()
  await expect(page).toHaveURL('/login')
})

test('shows pending and token-based email verification states', async ({ page }) => {
  await page.goto('/verify-email')
  await expect(page.getByRole('heading', { name: 'Verify your email address' })).toBeVisible()

  await page.goto('/verify-email?token=verification-token')
  await expect(page.getByRole('heading', { name: 'Verifying your email' })).toBeVisible()
})
