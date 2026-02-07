import { test, expect } from '@playwright/test'

test.describe('Gameplay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Switch to PvP mode to avoid AI interference during gameplay tests
    await page.getByRole('button', { name: 'vs Player' }).click()

    // Start the game
    await page.getByRole('button', { name: 'Start Game' }).click()

    // Wait for the board to render
    await expect(
      page.locator('[role="grid"][aria-label="Checkers game board"]')
    ).toBeVisible()
  })

  test('should render the board with the correct number of pieces (12 red, 12 black)', async ({
    page,
  }) => {
    // Count red pieces (Player 1) - they have aria-label containing "Red"
    const redPieces = page.locator('[role="img"][aria-label*="Red"]')
    await expect(redPieces).toHaveCount(12)

    // Count black pieces (Player 2) - they have aria-label containing "Black"
    const blackPieces = page.locator('[role="img"][aria-label*="Black"]')
    await expect(blackPieces).toHaveCount(12)
  })

  test('should highlight valid moves when selecting a piece', async ({ page }) => {
    // Red starts. Click on a red piece at row 5, col 0 (a valid starting piece)
    const pieceCell = page.locator('[data-row="5"][data-col="0"]')
    await pieceCell.click()

    // The cell should become selected (aria-selected="true")
    await expect(pieceCell).toHaveAttribute('aria-selected', 'true')

    // A valid move destination should appear - row 4, col 1 is diagonally forward
    const destinationCell = page.locator('[data-row="4"][data-col="1"]')
    await expect(destinationCell).toHaveAttribute(
      'aria-label',
      /valid move destination/
    )
  })

  test('should make a move when clicking a highlighted destination', async ({
    page,
  }) => {
    // Select a red piece at row 5, col 0
    await page.locator('[data-row="5"][data-col="0"]').click()

    // Click on valid destination at row 4, col 1
    await page.locator('[data-row="4"][data-col="1"]').click()

    // Wait for the move animation to complete
    await page.waitForTimeout(800)

    // The piece should now be at row 4, col 1
    const destinationCell = page.locator('[data-row="4"][data-col="1"]')
    await expect(destinationCell).toHaveAttribute('aria-label', /Red piece/)

    // The original cell should be empty
    const originalCell = page.locator('[data-row="5"][data-col="0"]')
    await expect(originalCell).toHaveAttribute('aria-label', /empty/)
  })

  test('should change the turn indicator after a move', async ({ page }) => {
    // Should start as Red's Turn
    await expect(page.getByText("Red's Turn")).toBeVisible()

    // Make a move: select piece at row 5, col 0
    await page.locator('[data-row="5"][data-col="0"]').click()

    // Move to row 4, col 1
    await page.locator('[data-row="4"][data-col="1"]').click()

    // Wait for the move animation to complete
    await page.waitForTimeout(800)

    // Turn indicator should now show Black's Turn
    await expect(page.getByText("Black's Turn")).toBeVisible()
  })

  test('should reset the board when New Game is clicked', async ({ page }) => {
    // Make a move to change the board state
    await page.locator('[data-row="5"][data-col="0"]').click()
    await page.locator('[data-row="4"][data-col="1"]').click()
    await page.waitForTimeout(800)

    // Verify the board has changed (piece at new position)
    await expect(
      page.locator('[data-row="4"][data-col="1"]')
    ).toHaveAttribute('aria-label', /Red piece/)

    // Click New Game
    await page.getByRole('button', { name: 'New Game' }).click()

    // Wait for reset
    await page.waitForTimeout(300)

    // Board should be back to initial state - row 5, col 0 should have a Red piece again
    await expect(
      page.locator('[data-row="5"][data-col="0"]')
    ).toHaveAttribute('aria-label', /Red piece/)

    // Row 4, col 1 should be empty again
    await expect(
      page.locator('[data-row="4"][data-col="1"]')
    ).toHaveAttribute('aria-label', /empty/)

    // Turn indicator should show Red's Turn
    await expect(page.getByText("Red's Turn")).toBeVisible()

    // Piece counts should be 12 each again
    const redPieces = page.locator('[role="img"][aria-label*="Red"]')
    await expect(redPieces).toHaveCount(12)

    const blackPieces = page.locator('[role="img"][aria-label*="Black"]')
    await expect(blackPieces).toHaveCount(12)
  })

  test('should undo a move when the Undo button is clicked', async ({ page }) => {
    // Make a move: select red piece at row 5, col 0
    await page.locator('[data-row="5"][data-col="0"]').click()
    await page.locator('[data-row="4"][data-col="1"]').click()
    await page.waitForTimeout(800)

    // Verify move was made
    await expect(
      page.locator('[data-row="4"][data-col="1"]')
    ).toHaveAttribute('aria-label', /Red piece/)

    // Click Undo button
    const undoButton = page.getByRole('button', { name: /Undo/ })
    await expect(undoButton).toBeVisible()
    await undoButton.click()

    // Wait for undo to process
    await page.waitForTimeout(300)

    // Piece should be back at original position
    await expect(
      page.locator('[data-row="5"][data-col="0"]')
    ).toHaveAttribute('aria-label', /Red piece/)

    // Destination should be empty again
    await expect(
      page.locator('[data-row="4"][data-col="1"]')
    ).toHaveAttribute('aria-label', /empty/)

    // Turn indicator should be back to Red's Turn
    await expect(page.getByText("Red's Turn")).toBeVisible()
  })

  test('should deselect a piece when clicking an invalid square', async ({
    page,
  }) => {
    // Select a red piece at row 5, col 0
    const pieceCell = page.locator('[data-row="5"][data-col="0"]')
    await pieceCell.click()

    // Should be selected
    await expect(pieceCell).toHaveAttribute('aria-selected', 'true')

    // Click on an invalid destination (a light square or occupied square)
    // Row 3, col 0 is a light square (3+0=3, odd) - wait, (3+0)%2=1 means dark
    // Row 4, col 0 is a light square (4+0=4, even)
    await page.locator('[data-row="4"][data-col="0"]').click()

    // Selection should be cleared
    await expect(pieceCell).toHaveAttribute('aria-selected', 'false')
  })

  test('should show piece counts in the game info area', async ({ page }) => {
    // In PvP mode, piece counts use "Red" and "Black" labels
    await expect(page.getByText('Red')).toBeVisible()
    await expect(page.getByText('Black')).toBeVisible()

    // Both should show 12 pieces initially
    const pieceCountRegion = page.locator('[aria-label="Piece count"]')
    await expect(pieceCountRegion.getByText('12').first()).toBeVisible()
    await expect(pieceCountRegion.getByText('12').last()).toBeVisible()
  })

  test('should render 64 cells (8x8 board)', async ({ page }) => {
    // The board should have 64 cells with role="gridcell"
    const cells = page.locator('[role="gridcell"]')
    await expect(cells).toHaveCount(64)
  })
})
