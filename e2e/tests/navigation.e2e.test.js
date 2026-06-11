/**
 * Suite E2E — Navegación y vistas principales (HU13, HU17)
 *
 * TC-E2E-NAV-01  Directorio público carga para un usuario autenticado, sin error
 * TC-E2E-NAV-02  Perfil muestra los datos del usuario logueado
 */
const {
  launchBrowser, newPage, loginE2E, BASE_URL, E2E_EMAIL,
} = require('../helpers/puppeteer');

describe('E2E — Navegación y vistas principales', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await launchBrowser();
    page    = await newPage(browser);
    await loginE2E(page);
  });
  afterAll(async () => { await browser.close(); });

  test('TC-E2E-NAV-01 | Directorio público carga sin error', async () => {
    await page.goto(`${BASE_URL}/directorio`, { waitUntil: 'networkidle2' });
    expect(page.url()).toContain('/directorio');
    await page.waitForSelector('[data-testid="directory-title"]', { visible: true });

    // Esperar a que termine el fetch (desaparece "Cargando…")
    await page.waitForFunction(
      () => !document.body.innerText.includes('Cargando…'),
      { timeout: 10000, polling: 200 }
    );

    // Sin mensaje de error de carga (la página lo renderiza con role="alert")
    const errorAlert = await page.$('[role="alert"]');
    expect(errorAlert).toBeNull();

    // Renderizó un resultado real: cards de fondos o el estado vacío explícito
    const bodyText = await page.$eval('body', el => el.innerText);
    const cards = await page.$$('[data-testid="fund-card"]');
    expect(cards.length > 0 || bodyText.includes('No hay fondos públicos disponibles')).toBe(true);
  });

  test('TC-E2E-NAV-02 | Perfil muestra los datos del usuario logueado', async () => {
    await page.goto(`${BASE_URL}/perfil`, { waitUntil: 'networkidle2' });
    expect(page.url()).toContain('/perfil');

    // El correo del usuario seedeado debe renderizarse en "Información de cuenta"
    await page.waitForFunction(
      (email) => document.body.innerText.includes(email),
      { timeout: 10000, polling: 200 },
      E2E_EMAIL
    );
    const bodyText = await page.$eval('body', el => el.innerText);
    expect(bodyText).toContain('Mi perfil');
    expect(bodyText).toContain(E2E_EMAIL);
  });
});
