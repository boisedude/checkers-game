import { test, expect } from '@playwright/test'

const cell = (page: import('@playwright/test').Page, row: number, col: number) =>
  page.locator(`[data-row="${row}"][data-col="${col}"]`)

test.describe('Playing Bella', () => {
  test.beforeEach(async ({ page }) => {
    // The first visit opens How to play; these tests start past it.
    await page.addInitScript(() => localStorage.setItem('checkers-tutorial-completed', 'true'))
    await page.goto('/?character=bella')
    await expect(page.getByRole('grid', { name: 'Checkers game board' })).toBeVisible()
  })

  test('sets up 64 squares and 12 men a side', async ({ page }) => {
    await expect(page.getByRole('gridcell')).toHaveCount(64)
    await expect(page.locator('[role="img"][aria-label^="Red"]')).toHaveCount(12)
    await expect(page.locator('[role="img"][aria-label^="Black"]')).toHaveCount(12)
  })

  test('selecting a man marks where it can go; another square clears it', async ({ page }) => {
    await cell(page, 5, 0).click()
    await expect(cell(page, 5, 0)).toHaveAttribute('aria-selected', 'true')
    await expect(cell(page, 4, 1)).toHaveAttribute('aria-label', /valid move destination/)
    await cell(page, 4, 0).click()
    await expect(cell(page, 5, 0)).toHaveAttribute('aria-selected', 'false')
  })

  test('a move is answered, and Undo takes both back', async ({ page }) => {
    await cell(page, 5, 0).click()
    await cell(page, 4, 1).click()
    await expect(cell(page, 4, 1)).toHaveAttribute('aria-label', /Red piece/)
    await expect(page.locator('.arcade-turn')).toHaveText(/Your turn|You must jump/, { timeout: 10000 })
    await page.getByRole('button', { name: /^Undo/ }).click()
    await expect(cell(page, 5, 0)).toHaveAttribute('aria-label', /Red piece/)
    await expect(cell(page, 4, 1)).toHaveAttribute('aria-label', /empty/)
    await expect(page.locator('[role="img"][aria-label^="Black"]')).toHaveCount(12)
  })

  test('Hint marks a move with the shared ring', async ({ page }) => {
    await page.getByRole('button', { name: 'Hint', exact: true }).click()
    await expect(page.locator('.arcade-hint')).toHaveCount(2)
  })

  test('New game resets the board', async ({ page }) => {
    await cell(page, 5, 0).click()
    await cell(page, 4, 1).click()
    await expect(page.locator('.arcade-turn')).toHaveText(/Your turn|You must jump/, { timeout: 10000 })
    await page.getByRole('button', { name: 'New game' }).click()
    await expect(cell(page, 5, 0)).toHaveAttribute('aria-label', /Red piece/)
    await expect(cell(page, 4, 1)).toHaveAttribute('aria-label', /empty/)
  })

  test('the More menu holds the other actions', async ({ page }) => {
    await page.getByRole('button', { name: 'More' }).click()
    await expect(page.getByRole('menuitem')).toHaveText(['How to play', 'Stats', 'Achievements', 'Game history', 'Change mode'])
    await page.getByRole('menuitem', { name: 'Game history' }).click()
    await expect(page.getByRole('dialog')).toContainText('History')
  })
})
