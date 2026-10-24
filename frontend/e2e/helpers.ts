import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'TestPassword123!'

// Register, complete the one-time profile setup, and land on home.
export async function registerWithProfile(page: Page, email: string, username = `u${Date.now()}`) {
  await page.goto('/register')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/profile/edit')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Display name').fill('E2E Tester')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL('/')
}
