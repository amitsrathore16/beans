import { test, expect } from '@playwright/test'

const EMAIL    = `e2e-logs+${Date.now()}@grounded.test`
const PASSWORD = 'TestPassword123!'

test.describe('Log CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('add home brew log', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click()
    await page.fill('input[placeholder="e.g. Ethiopia Yirgacheffe"]', 'Test Blend')
    await page.fill('input[placeholder="18"]', '18')
    await page.fill('input[placeholder="36"]', '36')
    await page.getByRole('button', { name: 'Save log' }).click()

    await expect(page.getByText('Test Blend')).toBeVisible()
  })

  test('add café tasting', async ({ page }) => {
    await page.getByRole('button', { name: '+' }).click()
    await page.getByRole('button', { name: 'Café' }).click()
    await page.fill('input[placeholder="e.g. Ethiopia Yirgacheffe"]', 'Single Origin Espresso')
    await page.fill('input[placeholder="Blue Bottle Coffee"]', 'Monmouth')
    await page.getByRole('button', { name: 'Save log' }).click()

    // Switch to café tab to see it
    await page.getByRole('button', { name: 'Café tastings' }).click()
    await expect(page.getByText('Single Origin Espresso')).toBeVisible()
  })

  test('brew again (exact) adds duplicate to list', async ({ page }) => {
    // Add a home brew first
    await page.getByRole('button', { name: '+' }).click()
    await page.fill('input[placeholder="e.g. Ethiopia Yirgacheffe"]', 'Brew Again Test')
    await page.getByRole('button', { name: 'Save log' }).click()
    await expect(page.getByText('Brew Again Test')).toBeVisible()

    // Use brew again
    await page.getByRole('button', { name: 'Brew again ↓' }).click()
    await page.getByRole('button', { name: 'Exact copy' }).click()

    // Two cards should now exist
    await expect(page.getByText('Brew Again Test')).toHaveCount(2)
  })
})
