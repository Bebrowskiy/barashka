import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

const SCREENSHOTS_DIR = './screenshots';
const BASE_URL = 'http://localhost:3000';

if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshots() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    console.log('Opening app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Light theme screenshot
    console.log('Taking light theme screenshot...');
    await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('barashka-theme', 'light');
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/lightTheme.png`, fullPage: false });

    // Dark theme screenshot
    console.log('Taking dark theme screenshot...');
    await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('barashka-theme', 'dark');
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/darkTheme.png`, fullPage: false });

    // Try to navigate to a playlist or artist view for more screenshots
    // Click on first track to start playing
    console.log('Looking for tracks to click...');
    const trackCards = await page.$$('[data-testid="track-card"], .track-card, [class*="cursor-pointer"][class*="group"]');
    if (trackCards.length > 0) {
        console.log(`Found ${trackCards.length} track cards, clicking first one...`);
        await trackCards[0].click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/playerPlaying.png`, fullPage: false });
    }

    // Try to open fullscreen player
    console.log('Looking for fullscreen player button...');
    const fullscreenBtn = await page.$('button[title="Fullscreen"], [aria-label="Fullscreen"]');
    if (fullscreenBtn) {
        console.log('Clicking fullscreen button...');
        await fullscreenBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/fullscreenPlayer.png`, fullPage: false });
        // Close fullscreen
        const closeBtn = await page.$('button[title="Close"], [aria-label="Close"]');
        if (closeBtn) await closeBtn.click();
        await page.waitForTimeout(500);
    }

    // Try to navigate to Library
    console.log('Looking for Library navigation...');
    const libraryNav = await page.$('text=Library, text=Библиотека');
    if (libraryNav) {
        console.log('Clicking Library...');
        await libraryNav.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/library.png`, fullPage: false });
    }

    // Try to navigate to Settings
    console.log('Looking for Settings navigation...');
    const settingsNav = await page.$('text=Settings, text=Настройки');
    if (settingsNav) {
        console.log('Clicking Settings...');
        await settingsNav.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/settings.png`, fullPage: false });
    }

    // Go back to home
    const homeNav = await page.$('text=Home, text=Главная');
    if (homeNav) {
        await homeNav.click();
        await page.waitForTimeout(1000);
    }

    // Mobile viewport screenshot
    console.log('Taking mobile screenshot...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
        document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/mobile.png`, fullPage: false });

    await browser.close();
    console.log('Screenshots taken successfully!');
}

takeScreenshots().catch(console.error);
