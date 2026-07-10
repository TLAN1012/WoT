import { expect, test, type Page } from '@playwright/test'
import { PNG } from 'pngjs'

function screenshotStats(buffer: Buffer): { uniqueColors: number; paintedPixels: number } {
  const image = PNG.sync.read(buffer)
  const colors = new Set<string>()
  let paintedPixels = 0
  for (let index = 0; index < image.data.length; index += 64) {
    const alpha = image.data[index + 3]
    if (alpha > 0) paintedPixels += 1
    colors.add(`${image.data[index]}-${image.data[index + 1]}-${image.data[index + 2]}-${alpha}`)
  }
  return { uniqueColors: colors.size, paintedPixels }
}

async function assertPlayableCanvas(page: Page): Promise<Buffer> {
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  const screenshot = await page.screenshot()
  const stats = screenshotStats(screenshot)
  expect(stats.paintedPixels).toBeGreaterThan(800)
  expect(stats.uniqueColors).toBeGreaterThan(20)
  return screenshot
}

async function activeScene(page: Page): Promise<string> {
  return page.evaluate(() => window.__WOT_GAME__.scene.getScenes(true)[0]?.scene.key ?? '')
}

async function selectedUnit(page: Page): Promise<string> {
  return page.evaluate(() => {
    const scene = window.__WOT_GAME__.scene.getScene('battle') as unknown as { selectedId?: string }
    return scene.selectedId ?? ''
  })
}

async function battleSnapshot(page: Page): Promise<{ round: number; yao: { q: number; r: number } }> {
  return page.evaluate(() => {
    const scene = window.__WOT_GAME__.scene.getScene('battle') as unknown as {
      round: number
      units: Array<{ id: string; q: number; r: number }>
    }
    const yao = scene.units.find((unit) => unit.id === 'yao')!
    return { round: scene.round, yao: { q: yao.q, r: yao.r } }
  })
}

async function hexPoint(page: Page, q: number, r: number): Promise<{ x: number; y: number }> {
  return page.evaluate(({ q, r }) => {
    const scene = window.__WOT_GAME__.scene.getScene('battle') as unknown as {
      hexCenter: (hex: { q: number; r: number }) => { x: number; y: number }
    }
    return scene.hexCenter({ q, r })
  }, { q, r })
}

async function tooltipText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const scene = window.__WOT_GAME__.scene.getScene('battle') as unknown as {
      tooltip?: { list: Array<{ text?: string }> }
    }
    return scene.tooltip?.list.map((item) => item.text ?? '').join('\n') ?? ''
  })
}

async function isLongPressTriggered(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const scene = window.__WOT_GAME__.scene.getScene('battle') as unknown as { longPressTriggered: boolean }
    return scene.longPressTriggered
  })
}

test('desktop campaign opens a rendered tactical battle', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  await expect(page).toHaveTitle(/Warlords of Takao/)
  const campaign = await assertPlayableCanvas(page)
  expect(await activeScene(page)).toBe('campaign')
  await page.screenshot({ path: 'test-results/wot-desktop-campaign.png' })

  await page.locator('canvas').click({ position: { x: 1100, y: 360 } })
  await expect.poll(() => activeScene(page)).toBe('battle')
  await page.waitForTimeout(250)
  const battle = await assertPlayableCanvas(page)
  await page.screenshot({ path: 'test-results/wot-desktop-battle.png' })
  expect(battle.equals(campaign)).toBe(false)
  const forest = await hexPoint(page, 2, 1)
  await page.mouse.move(forest.x, forest.y)
  await expect.poll(() => tooltipText(page)).toContain('森林')
  await page.waitForTimeout(120)
  await page.screenshot({ path: 'test-results/wot-desktop-tooltip.png' })
  const yao = await hexPoint(page, 0, 2)
  await page.mouse.move(yao.x, yao.y)
  await expect.poll(() => tooltipText(page)).toContain('友軍 · 姚仁')
  await expect.poll(() => tooltipText(page)).toContain('防波壁')
  await page.screenshot({ path: 'test-results/wot-desktop-unit-tooltip.png' })
  await page.locator('canvas').click({ position: yao })
  await expect.poll(() => selectedUnit(page)).toBe('yao')
  await page.mouse.move(800, 700)
  await page.waitForTimeout(120)
  await page.screenshot({ path: 'test-results/wot-desktop-selected.png' })
  const destination = await hexPoint(page, 1, 1)
  await page.locator('canvas').click({ position: destination })
  await expect.poll(() => battleSnapshot(page)).toMatchObject({ yao: { q: 1, r: 1 } })
  await page.locator('canvas').click({ position: { x: 1110, y: 620 } })
  await expect.poll(() => battleSnapshot(page), { timeout: 8_000 }).toMatchObject({ round: 2 })
  expect(errors).toEqual([])
})

test('mobile portrait campaign and battle remain painted', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const campaign = await assertPlayableCanvas(page)
  expect(await activeScene(page)).toBe('campaign')
  await page.screenshot({ path: 'test-results/wot-mobile-campaign.png' })

  await page.locator('canvas').click({ position: { x: 195, y: 759 } })
  await expect.poll(() => activeScene(page)).toBe('battle')
  await page.waitForTimeout(250)
  const battle = await assertPlayableCanvas(page)
  await page.screenshot({ path: 'test-results/wot-mobile-battle.png' })
  expect(battle.equals(campaign)).toBe(false)
  const forest = await hexPoint(page, 2, 1)
  await page.mouse.move(forest.x, forest.y)
  await page.mouse.down()
  await page.waitForTimeout(520)
  expect(await isLongPressTriggered(page)).toBe(true)
  expect(await tooltipText(page)).toContain('森林')
  await page.screenshot({ path: 'test-results/wot-mobile-tooltip.png' })
  await page.mouse.up()
  const yao = await hexPoint(page, 0, 2)
  await page.mouse.move(yao.x, yao.y)
  await page.mouse.down()
  await page.waitForTimeout(520)
  expect(await isLongPressTriggered(page)).toBe(true)
  expect(await tooltipText(page)).toContain('友軍 · 姚仁')
  expect(await selectedUnit(page)).toBe('')
  await page.mouse.up()
  await page.locator('canvas').click({ position: yao })
  await expect.poll(() => selectedUnit(page)).toBe('yao')
  await page.mouse.move(380, 120)
  await page.waitForTimeout(120)
  await page.screenshot({ path: 'test-results/wot-mobile-selected.png' })
  expect(errors).toEqual([])
})
