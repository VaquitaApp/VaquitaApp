/**
 * Suite E2E — Autenticación (HU05-1)
 *
 * TC-E2E-AUTH-01  Login con credenciales válidas redirige a /fondos
 * TC-E2E-AUTH-02  Login con contraseña incorrecta muestra error visible
 * TC-E2E-AUTH-03  Logout cierra sesión y redirige a /login
 * TC-E2E-AUTH-04  Ruta protegida sin sesión redirige a /login
 */
const {
  launchBrowser, newPage, loginE2E,
  BASE_URL, E2E_EMAIL, E2E_PASSWORD,
} = require('../helpers/puppeteer');

describe('E2E — Autenticación', () => {
  let browser;
  let page;

  beforeAll(async () => { browser = await launchBrowser(); });
  afterAll(async ()  => { await browser.close(); });
  beforeEach(async () => { page = await newPage(browser); });
  afterEach(async ()  => { if (page && !page.isClosed()) await page.close(); });

  test('TC-E2E-AUTH-01 | Login válido redirige a /fondos', async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="login-form"]');
    await page.type('[data-testid="login-email"]', E2E_EMAIL);
    await page.type('[data-testid="login-password"]', E2E_PASSWORD);
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('[data-testid="btn-nuevo-fondo"]', { visible: true, timeout: 15000 });
    expect(page.url()).toContain('/fondos');
  });

  test('TC-E2E-AUTH-02 | Contraseña incorrecta muestra mensaje de error', async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="login-form"]');
    await page.type('[data-testid="login-email"]', E2E_EMAIL);
    await page.type('[data-testid="login-password"]', 'contraseña_incorrecta');
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('[data-testid="login-error"]', { visible: true });
    const errorText = await page.$eval('[data-testid="login-error"]', el => el.textContent);
    expect(errorText.length).toBeGreaterThan(0);
    expect(page.url()).toContain('/login');
  });

  test('TC-E2E-AUTH-03 | Logout cierra sesión y redirige a /login', async () => {
    await loginE2E(page);
    expect(page.url()).toContain('/fondos');
    await page.waitForSelector('[data-testid="nav-logout"]', { visible: true });
    await page.click('[data-testid="nav-logout"]');
    // React Router navega sin HTTP — esperar el formulario de login como confirmación
    await page.waitForSelector('[data-testid="login-form"]', { visible: true, timeout: 15000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-E2E-AUTH-04 | Ruta protegida sin sesión redirige a /login', async () => {
    await page.goto(`${BASE_URL}/fondos`, { waitUntil: 'networkidle2' });
    expect(page.url()).toContain('/login');
  });
});
