/**
 * Suite E2E — Navegación y Directorio Público (HU07, HU13)
 *
 * TC-E2E-NAV-01  Navbar muestra links "Mis fondos" y "Directorio público"
 * TC-E2E-NAV-02  /directorio carga sin redirigir a /login
 * TC-E2E-NAV-03  Directorio renderiza contenido (lista o vacío, sin error)
 * TC-E2E-NAV-04  /perfil carga la vista del perfil de usuario
 */
const {
  launchBrowser, newPage, loginE2E, BASE_URL,
} = require('../helpers/puppeteer');

describe('E2E — Navegación y Directorio', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await launchBrowser();
    page    = await newPage(browser);
    await loginE2E(page);
  });
  afterAll(async () => { await browser.close(); });

  test('TC-E2E-NAV-01 | Navbar muestra links principales', async () => {
    await page.goto(`${BASE_URL}/fondos`, { waitUntil: 'networkidle2' });
    const navText = await page.$eval('nav[aria-label="Principal"]', el => el.textContent);
    expect(navText).toContain('Mis fondos');
    expect(navText).toContain('Directorio público');
  });

  test('TC-E2E-NAV-02 | /directorio carga sin redirigir a /login', async () => {
    await page.goto(`${BASE_URL}/directorio`, { waitUntil: 'networkidle2' });
    expect(page.url()).toContain('/directorio');
  });

  test('TC-E2E-NAV-03 | Directorio renderiza sin error de carga', async () => {
    await page.goto(`${BASE_URL}/directorio`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const body = await page.$eval('body', el => el.textContent);
    expect(body.length).toBeGreaterThan(50);
    // No hay error de carga sin que aparezca algún contenido del directorio
    const hasLoadError = body.includes('No se pudo cargar el directorio');
    expect(hasLoadError).toBe(false);
  });

  test('TC-E2E-NAV-04 | /perfil carga la vista del perfil', async () => {
    await page.goto(`${BASE_URL}/perfil`, { waitUntil: 'networkidle2' });
    expect(page.url()).toContain('/perfil');
    const body = await page.$eval('body', el => el.textContent);
    const hasProfileContent =
      body.includes('Perfil')  ||
      body.includes('Email')   ||
      body.includes('cuenta')  ||
      body.includes('e2e@vaquitaapp.test');
    expect(hasProfileContent).toBe(true);
  });
});
