/**
 * Suite E2E — Gestión de Fondos (HU06, HU07, HU08, HU09, HU10)
 *
 * Cubre el CRUD completo como flujo de usuario, paso a paso:
 *
 * TC-E2E-FUND-01  Crear fondo libre → redirige al detalle
 * TC-E2E-FUND-02  Fondo creado aparece en listado "Mis Fondos"
 * TC-E2E-FUND-03  Detalle del fondo muestra el nombre correcto
 * TC-E2E-FUND-04  Editar nombre del fondo y verificar cambio en detalle
 * TC-E2E-FUND-05  Filtrar por nombre incluye el fondo buscado y excluye los demás
 * TC-E2E-FUND-06  Eliminar fondo sin aportes lo quita del listado
 *
 * NOTA: los tests comparten estado en orden (el fondo creado en FUND-01 se
 * lista, edita, filtra y elimina en los siguientes). Corren con --runInBand.
 *
 * NOTA TC-E2E-FUND-06: la app usa un ConfirmModal de React con campo de
 * keyword obligatorio (escribir "ELIMINAR" para confirmar), NO un
 * window.confirm nativo.
 */
const {
  launchBrowser, newPage, loginE2E,
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
    await page.waitForSelector('[data-testid="fund-name"]');

    await page.type('[data-testid="fund-name"]', FUND_NAME);
    await page.type('[data-testid="fund-goal"]', 'Objetivo de prueba E2E');
    await page.type('[data-testid="fund-description"]', 'Descripción del fondo de prueba E2E');
    await clearAndType(page, '[data-testid="fund-target-amount"]', '50000');

    // Los inputs type="date" en React requieren setear el value vía nativeInputValueSetter
    const deadline = inDays(30);
    await page.evaluate((val) => {
      const input = document.querySelector('[data-testid="fund-deadline"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, deadline);

    await page.select('[data-testid="fund-bank"]', 'Banco Estado');
    await page.type('[data-testid="fund-account-number"]', '12345678');

    await page.waitForSelector('[data-testid="fund-submit"]:not([disabled])');
    await page.click('[data-testid="fund-submit"]');
    // React Router navega al detalle sin HTTP — esperar elemento del destino
    await page.waitForSelector('[data-testid="fund-detail-name"]', { visible: true, timeout: 15000 });

    fundUrl = page.url();
    expect(fundUrl).toMatch(/\/fondos\/[a-f0-9]{24}/);
  });

  test('TC-E2E-FUND-02 | Fondo creado aparece en "Mis Fondos"', async () => {
    await page.goto(`${BASE_URL}/fondos`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="fund-card"]', { timeout: 10000 });
    const textos = await page.$$eval('[data-testid="fund-card"]', cards => cards.map(c => c.textContent));
    expect(textos.some(t => t.includes(FUND_NAME))).toBe(true);
  });

  test('TC-E2E-FUND-03 | Detalle muestra nombre correcto', async () => {
    expect(fundUrl).toBeDefined();
    await page.goto(fundUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="fund-detail-name"]');
    const name = await page.$eval('[data-testid="fund-detail-name"]', el => el.textContent.trim());
    expect(name).toBe(FUND_NAME);
  });

  test('TC-E2E-FUND-04 | Editar nombre del fondo y verificar cambio', async () => {
    expect(fundUrl).toBeDefined();
    await page.goto(fundUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="btn-editar-fondo"]', { visible: true });
    await page.click('[data-testid="btn-editar-fondo"]');
    // React Router navega a /editar sin HTTP — esperar el formulario
    await page.waitForSelector('[data-testid="fund-name"]', { visible: true, timeout: 15000 });
    await clearAndType(page, '[data-testid="fund-name"]', FUND_NAME_EDITED);
    await page.waitForSelector('[data-testid="fund-submit"]:not([disabled])');
    await page.click('[data-testid="fund-submit"]');
    // React Router navega de vuelta al detalle sin HTTP — esperar el nombre actualizado
    await page.waitForSelector('[data-testid="fund-detail-name"]', { visible: true, timeout: 15000 });
    const updatedName = await page.$eval('[data-testid="fund-detail-name"]', el => el.textContent.trim());
    expect(updatedName).toBe(FUND_NAME_EDITED);
  });

  test('TC-E2E-FUND-05 | Filtrar por nombre incluye el fondo buscado y excluye los demás', async () => {
    await page.goto(`${BASE_URL}/fondos`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="filter-search"]');

    // Buscar por el nombre único del fondo → exactamente 1 resultado
    await clearAndType(page, '[data-testid="filter-search"]', FUND_NAME_EDITED);
    await page.waitForFunction(
      (name) => {
        const cards = [...document.querySelectorAll('[data-testid="fund-card"]')];
        return cards.length === 1 && cards[0].textContent.includes(name);
      },
      { timeout: 10000, polling: 200 },
      FUND_NAME_EDITED
    );

    // Buscar un nombre inexistente → 0 resultados (el filtro también excluye)
    await clearAndType(page, '[data-testid="filter-search"]', 'FONDO_INEXISTENTE_E2E_XYZ');
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="fund-card"]').length === 0,
      { timeout: 10000, polling: 200 }
    );
    const remaining = await page.$$('[data-testid="fund-card"]');
    expect(remaining).toHaveLength(0);
  });

  test('TC-E2E-FUND-06 | Eliminar fondo sin aportes lo quita del listado', async () => {
    expect(fundUrl).toBeDefined();
    await page.goto(fundUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="btn-eliminar-fondo"]', { visible: true });
    await page.click('[data-testid="btn-eliminar-fondo"]');

    // Interactuar con el ConfirmModal de React (no window.confirm)
    await page.waitForSelector('[data-testid="confirm-modal-keyword-input"]', { visible: true });
    await page.type('[data-testid="confirm-modal-keyword-input"]', 'ELIMINAR');
    await page.waitForSelector('[data-testid="confirm-modal-submit"]:not([disabled])');
    await page.click('[data-testid="confirm-modal-submit"]');

    // React Router navega a /fondos sin HTTP — esperar elemento del listado
    await page.waitForSelector('[data-testid="btn-nuevo-fondo"]', { visible: true, timeout: 15000 });
    expect(page.url()).toContain('/fondos');
    await new Promise(r => setTimeout(r, 500));
    const textos = await page.$$eval('[data-testid="fund-card"]', cards => cards.map(c => c.textContent)).catch(() => []);
    expect(textos.some(t => t.includes(FUND_NAME_EDITED))).toBe(false);
  });
});
