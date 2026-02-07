import { test, expect } from '@playwright/test'

test.describe('PvP Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Switch to PvP mode
    await page.getByRole('button', { name: 'vs Player' }).click()

    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click()

    // Wait for the board to render
    await expect(
      page.locator('[role="grid"][aria-label="Checkers game board"]')
    ).toBeVisible()
  })

  test('should start a PvP game successfully', async ({ page }) => {
    // Board should be visible
    await expect(
      page.locator('[role="grid"][aria-label="Checkers game board"]')
    ).toBeVisible()

    // Should have both red and black pieces
    const redPieces = page.locator('[role="img"][aria-label*="Red"]')
    await expect(redPieces).toHaveCount(12)

    const blackPieces = page.locator('[role="img"][aria-label*="Black"]')
    await expect(blackPieces).toHaveCount(12)

    // Game controls should be visible
    await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
  })

  test('should allow both players to take turns', async ({ page }) => {
    // Red's turn first
    await expect(page.getByText("Red's Turn")).toBeVisible()

    // Red makes a move: piece at row 5, col 0 to row 4, col 1
    await page.locator('[data-row="5"][data-col="0"]').click()
    await page.locator('[data-row="4"][data-col="1"]').click()
    await page.waitForTimeout(800)

    // Now it should be Black's turn
    await expect(page.getByText("Black's Turn")).toBeVisible()

    // Black makes a move: piece at row 2, col 1 to row 3, col 0
    await page.locator('[data-row="2"][data-col="1"]').click()
    await page.locator('[data-row="3"][data-col="0"]').click()
    await page.waitForTimeout(800)

    // Should be Red's turn again
    await expect(page.getByText("Red's Turn")).toBeVisible()
  })

  test('should show "Red\'s Turn" initially and "Black\'s Turn" after Red moves', async ({
    page,
  }) => {
    // Initial turn indicator
    const turnIndicator = page.locator('[role="status"]')
    await expect(turnIndicator).toContainText("Red's Turn")

    // Red makes a move
    await page.locator('[data-row="5"][data-col="0"]').click()
    await page.locator('[data-row="4"][data-col="1"]').click()
    await page.waitForTimeout(800)

    // Turn indicator should update
    await expect(turnIndicator).toContainText("Black's Turn")
  })

  test('should not show AI thinking spinner in PvP mode', async ({ page }) => {
    // Make a move to transition turns
    await page.locator('[data-row="5"][data-col="0"]').click()
    await page.locator('[data-row="4"][data-col="1"]').click()
    await page.waitForTimeout(800)

    // There should be no "thinking" spinner or text
    await expect(page.getByText(/is thinking/)).not.toBeVisible()

    // There should be no spinner element (animate-spin class)
    const spinner = page.locator('.animate-spin')
    await expect(spinner).toHaveCount(0)
  })

  test('should not show the opponent selector in PvP game controls', async ({
    page,
  }) => {
    // The "Your Opponent:" label should not be visible in PvP mode
    await expect(page.getByText('Your Opponent:')).not.toBeVisible()
  })

  test('should show piece labels as "Red" and "Black" in PvP mode', async ({
    page,
  }) => {
    // In PvP mode, piece count labels use "Red" and "Black" (not "Your Pieces" / character name)
    const pieceCountRegion = page.locator('[aria-label="Piece count"]')
    await expect(pieceCountRegion.getByText('Red')).toBeVisible()
    await expect(pieceCountRegion.getByText('Black')).toBeVisible()
  })

  test('should allow both players to make multiple moves in sequence', async ({
    page,
  }) => {
    // Red move 1: row 5, col 0 -> row 4, col 1
    await page.locator('[data-row="5"][data-col="0"]').click()
    await page.locator('[data-row="4"][data-col="1"]').click()
    await page.waitForTimeout(800)
    await expect(page.getByText("Black's Turn")).toBeVisible()

    // Black move 1: row 2, col 1 -> row 3, col 0
    await page.locator('[data-row="2"][data-col="1"]').click()
    await page.locator('[data-row="3"][data-col="0"]').click()
    await page.waitForTimeout(800)
    await expect(page.getByText("Red's Turn")).toBeVisible()

    // Red move 2: row 5, col 2 -> row 4, col 3
    await page.locator('[data-row="5"][data-col="2"]').click()
    await page.locator('[data-row="4"][data-col="3"]').click()
    await page.waitForTimeout(800)
    await expect(page.getByText("Black's Turn")).toBeVisible()

    // Black move 2: row 2, col 3 -> row 3, col 2
    await page.locator('[data-row="2"][data-col="3"]').click()
    await page.locator('[data-row="3"][data-col="2"]').click()
    await page.waitForTimeout(800)
    await expect(page.getByText("Red's Turn")).toBeVisible()

    // Verify pieces are in their new positions
    await expect(
      page.locator('[data-row="4"][data-col="1"]')
    ).toHaveAttribute('aria-label', /Red piece/)
    await expect(
      page.locator('[data-row="3"][data-col="0"]')
    ).toHaveAttribute('aria-label', /Black piece/)
    await expect(
      page.locator('[data-row="4"][data-col="3"]')
    ).toHaveAttribute('aria-label', /Red piece/)
    await expect(
      page.locator('[data-row="3"][data-col="2"]')
    ).toHaveAttribute('aria-label', /Black piece/)
  })
})
