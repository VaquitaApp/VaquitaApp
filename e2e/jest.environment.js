/**
 * jest.environment.js — Entorno de test con evidencia automática en fallos.
 *
 * Escucha el evento `test_fn_failure` de jest-circus y captura un screenshot
 * de cada página de Puppeteer abierta (registradas en global.__E2E_PAGES__
 * por helpers/puppeteer.js#newPage), usando el helper screenshot().
 * Los archivos quedan en reports/ como FAIL-<test>-<timestamp>.png.
 */
const { TestEnvironment } = require('jest-environment-node');
const { screenshot } = require('./helpers/puppeteer');

class E2EEnvironment extends TestEnvironment {
  async handleTestEvent(event) {
    if (event.name !== 'test_fn_failure') return;

    const pages = this.global.__E2E_PAGES__;
    if (!pages || pages.size === 0) return;

    const testName = (event.test?.name || 'test').replace(/[^\w.-]+/g, '_').slice(0, 80);
    for (const page of pages) {
      try {
        if (!page.isClosed()) await screenshot(page, `FAIL-${testName}`);
      } catch {
        // La página pudo cerrarse a mitad de la captura — no romper el run.
      }
    }
  }
}

module.exports = E2EEnvironment;
