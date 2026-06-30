import { test, expect } from '@playwright/test'

const EMAIL    = `e2e+${Date.now()}@grounded.test`
const PASSWORD = 'TestPassword123!'

test.describe('Auth flow', () => {
  test('register → home → sign out → login', async ({ page }) => {
    // Register
    await page.goto('/register')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')

    // Should land on home
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Home brews')).toBeVisible()

    // Sign out
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')

    // Login again
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})
