import { test, expect } from '@playwright/test'

const EMAIL    = `e2e-beans+${Date.now()}@grounded.test`
const PASSWORD = 'TestPassword123!'

test.describe('Beans inventory', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('add a bean bag and see it in inventory', async ({ page }) => {
    await page.getByRole('button', { name: 'Beans' }).click()
    await page.getByRole('button', { name: '+' }).click()

    await page.fill('input[placeholder="e.g. Ethiopia Yirgacheffe"]', 'Colombia Huila')
    await page.fill('input[placeholder="250"]', '250')

    await page.getByRole('button', { name: 'Add to inventory' }).click()

    await expect(page.getByText('Colombia Huila')).toBeVisible()
    await expect(page.getByText('250g')).toBeVisible()
  })

  test('freshness badge shows for beans with roast date', async ({ page }) => {
    await page.getByRole('button', { name: 'Beans' }).click()
    await page.getByRole('button', { name: '+' }).click()

    await page.fill('input[placeholder="e.g. Ethiopia Yirgacheffe"]', 'Fresh Batch')
    await page.fill('input[placeholder="250"]', '200')

    // Set roast date to today
    const today = new Date().toISOString().split('T')[0]
    await page.locator('input[type="date"]').first().fill(today)

    await page.getByRole('button', { name: 'Add to inventory' }).click()

    await expect(page.getByText('Fresh')).toBeVisible()
  })
})
