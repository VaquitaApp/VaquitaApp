/**
 * helpers/puppeteer.js — Utilidades compartidas para los tests E2E.
 */
const puppeteer = require('puppeteer');

const BASE_URL      = process.env.BASE_URL      || 'http://localhost:5173';
const E2E_EMAIL     = process.env.E2E_EMAIL     || 'e2e@vaquitaapp.test';
const E2E_PASSWORD  = process.env.E2E_PASSWORD  || 'E2ePassword1!';

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
}

async function newPage(browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  await page.setViewport({ width: 1280, height: 800 });
  return page;
}

async function loginE2E(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-testid="login-email"]');
  await page.type('[data-testid="login-email"]', E2E_EMAIL);
  await page.type('[data-testid="login-password"]', E2E_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(url => url.includes('/fondos'), { timeout: 15000 });
}

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function waitAndClick(page, selector) {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
}

async function clearAndType(page, selector, text) {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type(selector, text);
}

async function screenshot(page, name) {
  const path = require('path');
  const fs   = require('fs');
  const dir  = path.join(__dirname, '../reports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

module.exports = {
  BASE_URL, E2E_EMAIL, E2E_PASSWORD,
  launchBrowser, newPage, loginE2E,
  inDays, waitAndClick, clearAndType, screenshot,
};
