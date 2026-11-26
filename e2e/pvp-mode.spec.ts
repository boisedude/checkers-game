import { test, expect } from '@playwright/test'

const cell = (page: import('@playwright/test').Page, row: number, col: number) =>
  page.locator(`[data-row="${row}"][data-col="${col}"]`)

test.describe('Two players', () => {
  test.beforeEach(async ({ page }) => {
    // The first visit opens How to play; these tests start past it.
    await page.addInitScript(() => localStorage.setItem('checkers-tutorial-completed', 'true'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Two players' }).click()
    await page.getByRole('button', { name: 'Start game' }).click()
    await expect(page.getByRole('grid', { name: 'Checkers game board' })).toBeVisible()
  })

  test('both sides take turns', async ({ page }) => {
    const pill = page.locator('.arcade-turn')
    await expect(pill).toHaveText("Red's turn")
    await cell(page, 5, 0).click()
    await cell(page, 4, 1).click()
    await expect(pill).toHaveText("Black's turn")
    await expect(cell(page, 2, 1)).toHaveAttribute('aria-disabled', 'false')
    await cell(page, 2, 1).click()
    await cell(page, 3, 0).click()
    await expect(pill).toHaveText("Red's turn")
    await expect(cell(page, 4, 1)).toHaveAttribute('aria-label', /Red piece/)
    await expect(cell(page, 3, 0)).toHaveAttribute('aria-label', /Black piece/)
  })

  test('labels the sides Red and Black, with no opponent or hint', async ({ page }) => {
    const score = page.locator('.arcade-score')
    await expect(score).toContainText('Red')
    await expect(score).toContainText('Black')
    await expect(page.locator('.arcade-chip')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Hint', exact: true })).toHaveCount(0)
    await expect(page.getByText(/is thinking/)).toHaveCount(0)
  })

  test('a forced capture is announced and ringed', async ({ page }) => {
    // Red c3-d4, Black f6-e5: Red must take e5 from d4.
    const pill = page.locator('.arcade-turn')
    await cell(page, 5, 2).click()
    await cell(page, 4, 3).click()
    await expect(pill).toHaveText("Black's turn")
    // Input waits for the slide to finish
    await expect(cell(page, 2, 5)).toHaveAttribute('aria-disabled', 'false')
    await cell(page, 2, 5).click()
    await cell(page, 3, 4).click()
    await expect(pill).toHaveText('Red must jump')
    await expect(cell(page, 4, 3)).toHaveAttribute('aria-disabled', 'false')
    await expect(cell(page, 4, 3)).toHaveAttribute('aria-label', /must jump/)
    await cell(page, 4, 3).click()
    await cell(page, 2, 5).click()
    await expect(cell(page, 3, 4)).toHaveAttribute('aria-label', /empty/)
    await expect(page.locator('.arcade-score strong').last()).toHaveText('11')
  })
})
