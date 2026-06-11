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
  await page.locator('[data-testid="login-email"]').fill(E2E_EMAIL);
  await page.locator('[data-testid="login-password"]').fill(E2E_PASSWORD);
  await page.locator('[data-testid="login-submit"]').click();
  await waitForURL(page, '/fondos');
}

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function waitAndClick(page, selector) {
  await page.locator(selector).click();
}

async function clearAndType(page, selector, text) {
  await page.locator(selector).fill(text);
}

async function waitForURL(page, check, timeout = 15000) {
  if (typeof check === 'string') {
    await page.waitForFunction(
      (s) => window.location.href.includes(s),
      { timeout, polling: 100 },
      check
    );
  } else {
    await page.waitForFunction(
      (src, flags) => new RegExp(src, flags).test(window.location.href),
      { timeout, polling: 100 },
      check.source,
      check.flags
    );
  }
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
  inDays, waitAndClick, clearAndType, screenshot, waitForURL,
};
