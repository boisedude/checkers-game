import { test, expect } from '@playwright/test'

test.describe('Welcome Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the welcome screen with title "Checkers"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Checkers' })).toBeVisible()
    await expect(page.getByText("at Coop's Arcade")).toBeVisible()
  })

  test('should toggle between "vs AI" and "vs Player" modes', async ({ page }) => {
    // Default mode is "vs AI"
    const vsAIButton = page.getByRole('button', { name: 'vs AI' })
    const vsPlayerButton = page.getByRole('button', { name: 'vs Player' })

    await expect(vsAIButton).toBeVisible()
    await expect(vsPlayerButton).toBeVisible()

    // "vs AI" should be selected by default (has active styling with white bg and shadow)
    await expect(vsAIButton).toHaveClass(/bg-white/)

    // Click "vs Player" to switch mode
    await vsPlayerButton.click()
    await expect(vsPlayerButton).toHaveClass(/bg-white/)

    // Click "vs AI" to switch back
    await vsAIButton.click()
    await expect(vsAIButton).toHaveClass(/bg-white/)
  })

  test('should show opponent cards in AI mode', async ({ page }) => {
    // In AI mode (default), opponent selection should be visible
    await expect(page.getByText('Choose Your Opponent')).toBeVisible()

    // All three characters should be listed
    await expect(page.getByText('Bella')).toBeVisible()
    await expect(page.getByText('Coop')).toBeVisible()
    await expect(page.getByText('Bentley')).toBeVisible()

    // Difficulty labels should be visible
    await expect(page.getByText('easy')).toBeVisible()
    await expect(page.getByText('medium')).toBeVisible()
    await expect(page.getByText('hard')).toBeVisible()
  })

  test('should hide opponent cards in PvP mode', async ({ page }) => {
    // Switch to PvP mode
    await page.getByRole('button', { name: 'vs Player' }).click()

    // Opponent selection should disappear
    await expect(page.getByText('Choose Your Opponent')).not.toBeVisible()

    // PvP description should appear
    await expect(
      page.getByText('Play against a friend on the same device')
    ).toBeVisible()
  })

  test('should select different opponents (Bella, Coop, Bentley)', async ({ page }) => {
    // By default, medium (Coop) should be selected
    // Click Bella (easy)
    await page.getByText('Bella').click()

    // The Bella card should have a checkmark
    const bellaCard = page.locator('button', { hasText: 'Bella' })
    await expect(bellaCard.locator('text=✓')).toBeVisible()

    // Click Bentley (hard)
    await page.getByText('Bentley').click()

    // Bentley should now be selected
    const bentleyCard = page.locator('button', { hasText: 'Bentley' })
    await expect(bentleyCard.locator('text=✓')).toBeVisible()

    // Bella should no longer show checkmark
    await expect(bellaCard.locator('text=✓')).not.toBeVisible()

    // Click Coop (medium)
    await page.getByText('Coop').click()

    // Coop should be selected
    const coopCard = page.locator('button', { hasText: 'Coop' })
    await expect(coopCard.locator('text=✓')).toBeVisible()
  })

  test('should show the Start Game button', async ({ page }) => {
    const startButton = page.getByRole('button', { name: 'Start Game' })
    await expect(startButton).toBeVisible()
    await expect(startButton).toBeEnabled()
  })

  test('should launch the game when Start Game is clicked', async ({ page }) => {
    // Click Start Game
    await page.getByRole('button', { name: 'Start Game' }).click()

    // Welcome screen elements should disappear
    await expect(page.getByText('Choose Your Opponent')).not.toBeVisible()

    // Game board should appear (the grid with role="grid")
    await expect(
      page.locator('[role="grid"][aria-label="Checkers game board"]')
    ).toBeVisible()

    // Turn indicator should appear
    await expect(page.getByText('Your Turn')).toBeVisible()

    // Game controls should appear (New Game button)
    await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
  })

  test('should show game board after starting in PvP mode', async ({ page }) => {
    // Switch to PvP mode
    await page.getByRole('button', { name: 'vs Player' }).click()

    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click()

    // Game board should appear
    await expect(
      page.locator('[role="grid"][aria-label="Checkers game board"]')
    ).toBeVisible()

    // PvP turn indicator should show "Red's Turn"
    await expect(page.getByText("Red's Turn")).toBeVisible()
  })
})
