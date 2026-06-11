/**
 * helpers/puppeteer.js — Utilidades compartidas para los tests E2E.
 *
 * NOTA ARQUITECTURAL: Esta app es una SPA con React Router (History API).
 * Las navegaciones internas NO generan eventos HTTP — no usar waitForNavigation
 * para rutas de React Router. En su lugar:
 *
 *  - Para el LOGIN: usamos Promise.all([waitForResponse('/auth/me'), click(submit)])
 *    porque la secuencia de red es POST /login → GET /me → setUser() → navigate().
 *    Esperar la respuesta de /me garantiza que el AuthContext ya tiene el usuario
 *    antes de intentar cualquier waitForSelector en rutas protegidas.
 *
 *  - Para otras navegaciones internas (editar, eliminar, etc.): waitForSelector
 *    sobre el primer elemento del destino que confirma que React terminó de montar.
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
 * loginE2E — Inicia sesión y espera a que el AuthContext tenga el usuario listo.
 *
 * Flujo de red del login:
 *   1. POST /api/auth/login  → guarda token en localStorage
 *   2. GET  /api/auth/me     → setUser() en AuthContext
 *   3. navigate('/fondos')   → React Router cambia URL (History API, sin HTTP)
 *
 * Usamos Promise.all para arrancar waitForResponse ANTES del click y evitar
 * cualquier race condition. Una vez que /me responde con 200, React ya tiene
 * el usuario y ProtectedRoute renderiza /fondos correctamente.
 */
async function loginE2E(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-testid="login-email"]');
  await page.type('[data-testid="login-email"]', E2E_EMAIL);
  await page.type('[data-testid="login-password"]', E2E_PASSWORD);

  // Arrancar escucha de /auth/me ANTES del click para no perder la respuesta
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/auth/me') && res.status() === 200,
      { timeout: 15000 }
    ),
    page.click('[data-testid="login-submit"]'),
  ]);

  // Dar tiempo a React para propagar setUser() y montar /fondos
  await page.waitForSelector('[data-testid="btn-nuevo-fondo"]', { visible: true, timeout: 10000 });
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
 * Solo usar cuando realmente necesitas verificar la URL — para sincronizar
 * renderizado prefiere waitForSelector sobre un elemento del destino.
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
