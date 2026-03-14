import { test, expect } from '@playwright/test';

test.describe('ADMA Communities E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Pagina carga correctamente', async ({ page }) => {
    await expect(page).toHaveTitle(/ADMA|Communities/);
  });

  test('Formulario visible', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });

  test('Sin errores de consola críticos', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.reload();
    await page.waitForTimeout(1000);
    const criticalErrors = errors.filter(e => !e.includes('Firebase'));
    expect(criticalErrors).toHaveLength(0);
  });
});
