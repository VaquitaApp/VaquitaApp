/**
 * Suite E2E — Gestión de Fondos (HU06, HU07, HU08, HU09, HU10)
 *
 * TC-E2E-FUND-01  Crear fondo libre → redirige al detalle
 * TC-E2E-FUND-02  Formulario valida campo nombre (required)
 * TC-E2E-FUND-03  Fondo creado aparece en listado "Mis Fondos"
 * TC-E2E-FUND-04  Detalle del fondo muestra el nombre correcto
 * TC-E2E-FUND-05  Editar nombre del fondo y verificar cambio en detalle
 * TC-E2E-FUND-06  Filtrar fondos por texto encuentra el fondo editado
 * TC-E2E-FUND-07  Eliminar fondo sin aportes lo quita del listado
 *
 * NOTA: TC-E2E-FUND-07 difiere del spec (que usaba page.once('dialog')).
 * La aplicación usa un ConfirmModal de React con campo de keyword obligatorio
 * (escribir "ELIMINAR" para confirmar), NO un window.confirm nativo.
 * El test interactúa con el modal usando data-testid="confirm-modal-keyword-input"
 * y data-testid="confirm-modal-submit".
 */
const {
  launchBrowser, newPage, loginE2E, waitForURL,
  BASE_URL, inDays, clearAndType,
} = require('../helpers/puppeteer');

const FUND_NAME        = `Fondo E2E ${Date.now()}`;
const FUND_NAME_EDITED = `${FUND_NAME} EDITADO`;

describe('E2E — Gestión de Fondos', () => {
  let browser;
  let page;
  let fundUrl;

  beforeAll(async () => {
    browser = await launchBrowser();
    page    = await newPage(browser);
    await loginE2E(page);
  });
  afterAll(async () => { await browser.close(); });

  test('TC-E2E-FUND-01 | Crear fondo libre exitosamente', async () => {
    await page.goto(`${BASE_URL}/fondos/crear`, { waitUntil: 'networkidle2' });

    await page.locator('[data-testid="fund-name"]').fill(FUND_NAME);
    await page.locator('[data-testid="fund-goal"]').fill('Objetivo de prueba E2E');
    await page.locator('[data-testid="fund-description"]').fill('Descripción del fondo de prueba E2E');
    await page.locator('[data-testid="fund-target-amount"]').fill('50000');

    // Los inputs type="date" en React requieren setear el value vía nativeInputValueSetter
    const deadline = inDays(30);
    await page.evaluate((val) => {
      const input = document.querySelector('[data-testid="fund-deadline"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, deadline);

    await page.locator('[data-testid="fund-bank"]').fill('Banco Estado');
    await page.locator('[data-testid="fund-account-number"]').fill('12345678');

    await page.locator('[data-testid="fund-submit"]').click();
    await waitForURL(page, /\/fondos\/[a-f0-9]{24}/);

    fundUrl = page.url();
    expect(fundUrl).toMatch(/\/fondos\/[a-f0-9]{24}/);
  });

  test('TC-E2E-FUND-02 | Campo nombre es required — validity.valid = false si vacío', async () => {
    await page.goto(`${BASE_URL}/fondos/crear`, { waitUntil: 'networkidle2' });
    const nameValid = await page.$eval('[data-testid="fund-name"]', el => el.validity.valid);
    expect(nameValid).toBe(false);
  });

  test('TC-E2E-FUND-03 | Fondo creado aparece en "Mis Fondos"', async () => {
    await page.goto(`${BASE_URL}/fondos`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="fund-card"]', { timeout: 10000 });
    const textos = await page.$$eval('[data-testid="fund-card"]', cards => cards.map(c => c.textContent));
    expect(textos.some(t => t.includes(FUND_NAME))).toBe(true);
  });

  test('TC-E2E-FUND-04 | Detalle muestra nombre correcto', async () => {
    expect(fundUrl).toBeDefined();
    await page.goto(fundUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="fund-detail-name"]');
    const name = await page.$eval('[data-testid="fund-detail-name"]', el => el.textContent.trim());
    expect(name).toBe(FUND_NAME);
  });

  test('TC-E2E-FUND-05 | Editar nombre del fondo y verificar cambio', async () => {
    expect(fundUrl).toBeDefined();
    await page.goto(fundUrl, { waitUntil: 'networkidle2' });
    await page.locator('[data-testid="btn-editar-fondo"]').click();
    await waitForURL(page, '/editar');
    await page.locator('[data-testid="fund-name"]').fill(FUND_NAME_EDITED);
    await page.locator('[data-testid="fund-submit"]').click();
    await waitForURL(page, /\/fondos\/[a-f0-9]{24}$/);
    await page.waitForSelector('[data-testid="fund-detail-name"]');
    const updatedName = await page.$eval('[data-testid="fund-detail-name"]', el => el.textContent.trim());
    expect(updatedName).toBe(FUND_NAME_EDITED);
  });

  test('TC-E2E-FUND-06 | Filtrar por texto encuentra el fondo', async () => {
    await page.goto(`${BASE_URL}/fondos`, { waitUntil: 'networkidle2' });
    await page.locator('[data-testid="filter-search"]').fill('E2E');
    // Espera debounce de 350ms + margen
    await new Promise(r => setTimeout(r, 600));
    const textos = await page.$$eval('[data-testid="fund-card"]', cards => cards.map(c => c.textContent));
    expect(textos.some(t => t.includes('E2E'))).toBe(true);
  });

  /**
   * TC-E2E-FUND-07 — DIFERENCIA CON EL SPEC
   *
   * El spec usaba `page.once('dialog', async dialog => { await dialog.accept(); })`
   * asumiendo un window.confirm nativo. La app usa un ConfirmModal de React con
   * campo de keyword obligatorio ("ELIMINAR"). Implementación correcta:
   * 1. Click en "Eliminar fondo" → abre ConfirmModal
   * 2. Escribir "ELIMINAR" en el campo del modal
   * 3. Click en "Confirmar" del modal
   */
  test('TC-E2E-FUND-07 | Eliminar fondo sin aportes lo quita del listado', async () => {
    expect(fundUrl).toBeDefined();
    await page.goto(fundUrl, { waitUntil: 'networkidle2' });
    await page.locator('[data-testid="btn-eliminar-fondo"]').click();

    // Interactuar con el ConfirmModal de React (no window.confirm)
    await page.locator('[data-testid="confirm-modal-keyword-input"]').fill('ELIMINAR');
    await page.locator('[data-testid="confirm-modal-submit"]').click();

    await waitForURL(page, /\/fondos(?!\/[a-f0-9]{24})/);
    expect(page.url()).toContain('/fondos');
    await new Promise(r => setTimeout(r, 500));
    const textos = await page.$$eval('[data-testid="fund-card"]', cards => cards.map(c => c.textContent)).catch(() => []);
    expect(textos.some(t => t.includes(FUND_NAME_EDITED))).toBe(false);
  });
});
