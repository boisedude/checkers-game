import { test, expect } from '@playwright/test'

test.describe('Welcome screen', () => {
  test.beforeEach(async ({ page }) => {
    // The first visit opens How to play; these tests start past it.
    await page.addInitScript(() => localStorage.setItem('checkers-tutorial-completed', 'true'))
    await page.goto('/')
  })

  test('offers one or two players, one player by default', async ({ page }) => {
    const one = page.getByRole('button', { name: 'One player' })
    const two = page.getByRole('button', { name: 'Two players' })
    await expect(one).toHaveAttribute('aria-pressed', 'true')
    await two.click()
    await expect(two).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Play against a friend on the same device')).toBeVisible()
    await one.click()
    await expect(one).toHaveAttribute('aria-pressed', 'true')
  })

  test('lists the three opponents and selects one', async ({ page }) => {
    const opponents = page.getByRole('group', { name: 'Opponent' })
    for (const name of ['Bella', 'Coop', 'Bentley']) {
      await expect(opponents.getByRole('button', { name: new RegExp(name) })).toBeVisible()
    }
    const bentley = opponents.getByRole('button', { name: /Bentley/ })
    await bentley.click()
    await expect(bentley).toHaveAttribute('aria-pressed', 'true')
    await expect(opponents.getByRole('button', { name: /Bella/ })).toHaveAttribute('aria-pressed', 'false')
  })

  test('starts a game against the chosen opponent', async ({ page }) => {
    await page.getByRole('group', { name: 'Opponent' }).getByRole('button', { name: /Bella/ }).click()
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(page.getByRole('grid', { name: 'Checkers game board' })).toBeVisible()
    await expect(page.locator('.arcade-turn')).toHaveText('Your turn')
    await expect(page.getByRole('combobox', { name: /Opponent: Bella/ })).toBeVisible()
  })

  test('skips setup when the arcade names the opponent', async ({ page }) => {
    await page.goto('/?character=bentley')
    await expect(page.getByRole('grid', { name: 'Checkers game board' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: /Opponent: Bentley/ })).toBeVisible()
  })
})
