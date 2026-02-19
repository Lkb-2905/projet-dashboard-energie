import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = 'http://localhost:5173/'
const screensDir = path.resolve(process.cwd(), '..', 'docs', 'screens')

const waitForCharts = async (page) => {
  await page.waitForSelector('.recharts-wrapper', { timeout: 15000 })
}

const run = async () => {
  await fs.mkdir(screensDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForSelector('.login-page', { timeout: 10000 })
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(screensDir, 'login.png'),
    fullPage: true,
  })

  await page.locator('input[type="text"]').fill('analyste.edf')
  await page.locator('input[type="password"]').fill('demo1234')
  await page.locator('button[type="submit"]').click()

  await page.waitForSelector('.dashboard-page', { timeout: 15000 })
  await waitForCharts(page)
  await page.waitForTimeout(1000)

  await page.screenshot({
    path: path.join(screensDir, 'dashboard.png'),
    fullPage: true,
  })

  const filtersCard = page.locator('.filters-card')
  await filtersCard.scrollIntoViewIfNeeded()
  await filtersCard.screenshot({
    path: path.join(screensDir, 'exports.png'),
  })

  const alertsCard = page.locator('.alerts-card')
  await alertsCard.scrollIntoViewIfNeeded()
  await alertsCard.screenshot({
    path: path.join(screensDir, 'alerts.png'),
  })

  await browser.close()
}

run().catch((error) => {
  console.error('Capture échouée:', error)
  process.exit(1)
})
