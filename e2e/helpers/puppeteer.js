/**
 * helpers/puppeteer.js — Utilidades compartidas para los tests E2E.
 *
 * NOTA ARQUITECTURAL: Esta app es una SPA con React Router (History API).
 * Las navegaciones internas NO generan eventos HTTP — no usar waitForNavigation
 * ni confiar en page.waitForURL para rutas internas. Siempre esperar un
 * elemento DOM del destino que confirme que el componente renderizó.
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

/**
 * loginE2E — Inicia sesión y espera a que la página de fondos esté lista.
 *
 * Usa waitForSelector sobre [data-testid="btn-nuevo-fondo"] porque:
 * - Ese elemento solo existe cuando /fondos cargó Y el usuario está autenticado
 * - Es inmune a race conditions de la History API (React Router)
 * - waitForNavigation NO funciona para SPAs con React Router
 */
async function loginE2E(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-testid="login-email"]');
  await page.type('[data-testid="login-email"]', E2E_EMAIL);
  await page.type('[data-testid="login-password"]', E2E_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  // Esperar un elemento que solo existe en /fondos cuando la sesión está activa
  await page.waitForSelector('[data-testid="btn-nuevo-fondo"]', { visible: true, timeout: 15000 });
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

/**
 * waitForURL — espera hasta que la URL del navegador incluya el patrón indicado.
 * Usa waitForFunction para ser compatible con Puppeteer v22 (sin page.waitForURL).
 * Solo usar para navegaciones EXTERNAS (page.goto) donde la URL se estabiliza.
 * Para navegaciones React Router internas, preferir waitForSelector sobre DOM.
 */
async function waitForURL(page, check, timeout = 15000) {
  if (typeof check === 'string') {
    await page.waitForFunction(
      (s) => window.location.href.includes(s),
      { timeout, polling: 200 },
      check
    );
  } else {
    await page.waitForFunction(
      (src, flags) => new RegExp(src, flags).test(window.location.href),
      { timeout, polling: 200 },
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
