import { test, expect } from '@playwright/test'
import { registerWithProfile, PASSWORD } from './helpers'

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test.describe('Profile', () => {
  test('setup is required before home', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[type="email"]', `e2e-gate+${Date.now()}@grounded.test`)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/profile/edit')
    await page.goto('/')
    await expect(page).toHaveURL('/profile/edit')
  })

  test('edit profile and view it', async ({ page }) => {
    const username = `edit${Date.now()}`
    await registerWithProfile(page, `e2e-edit+${Date.now()}@grounded.test`, username)

    await page.getByRole('link', { name: 'Profile' }).click()
    await expect(page).toHaveURL(`/u/${username}`)
    await page.getByRole('link', { name: 'Edit profile' }).click()

    await page.getByLabel('Bio').fill('Chasing the perfect V60')
    await page.getByLabel('Profile picture').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.locator('img[src*="avatars"]')).toBeVisible()
    await page.getByLabel('Intermediate').check()
    await page.getByRole('button', { name: 'Ethiopia' }).click()
    await page.getByLabel(/Social links/).fill('javascript:alert(1)')
    await page.getByRole('button', { name: 'Save profile' }).click()
    await expect(page.getByRole('alert')).toHaveText(/http/)

    await page.getByLabel(/Social links/).fill('https://instagram.com/grounded')
    await page.getByRole('button', { name: 'Save profile' }).click()

    await expect(page).toHaveURL(`/u/${username}`)
    await expect(page.getByText('Chasing the perfect V60')).toBeVisible()
    await expect(page.getByText('Ethiopia')).toBeVisible()
    await expect(page.getByText('Brews')).toBeVisible()
  })

  test('private profile is hidden from others; usernames are unique', async ({ page }) => {
    const owner = `priv${Date.now()}`
    await registerWithProfile(page, `e2e-priv+${Date.now()}@grounded.test`, owner)
    await page.goto('/profile/edit')
    await page.getByLabel('Private').check()
    await page.getByRole('button', { name: 'Save profile' }).click()
    await expect(page).toHaveURL(`/u/${owner}`)
    await expect(page.getByText('Private')).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()

    // Second user: same username (different case) is rejected, then can't see the private profile.
    await page.goto('/register')
    await page.fill('input[type="email"]', `e2e-other+${Date.now()}@grounded.test`)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.getByLabel('Username').fill(owner.toUpperCase())
    await page.getByLabel('Display name').fill('Other')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('alert')).toHaveText('That username is taken')

    await page.getByLabel('Username').fill(`other${Date.now()}`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL('/')
    await page.goto(`/u/${owner}`)
    await expect(page.getByText('Profile not found')).toBeVisible()
  })
})
