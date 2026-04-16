// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/');

test.describe('Order Form (index.html)', () => {

    test('page loads and shows title', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await expect(page.locator('#pageTitle')).toBeVisible();
        await expect(page.locator('#pageTitle')).toHaveText('הזמנת חולצות משפחתית');
    });

    test('shows "add shirt" prompt initially', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        // Should see the add button
        await expect(page.getByRole('button', { name: '+ הוסיפו חולצה' })).toBeVisible();
    });

    test('can add a shirt item', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("הוסיפו חולצה")');
        // Should see item #1
        await expect(page.locator('.order-item')).toHaveCount(1);
        await expect(page.locator('.item-number')).toHaveText('1');
    });

    test('can fill family details', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');

        await page.fill('#familyName', 'כהן');
        await page.fill('#familyContact', '050-1234567');

        // Verify state is updated - check input values persist after adding item
        await page.click('button:has-text("הוסיפו חולצה")');

        // After render, inputs should retain values
        await expect(page.locator('#familyName')).toHaveValue('כהן');
        await expect(page.locator('#familyContact')).toHaveValue('050-1234567');
    });

    test('can select color by clicking', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("הוסיפו חולצה")');

        // Click on "שחור" color
        await page.click('.color-option:has-text("שחור")');

        // Should be selected
        await expect(page.locator('.color-option.selected:has-text("שחור")')).toBeVisible();
    });

    test('can select size by clicking', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("הוסיפו חולצה")');

        // Click on XL
        await page.click('.size-btn:has-text("XL"):not(:has-text("2XL"))');

        // Should be selected
        await expect(page.locator('.size-btn.selected')).toHaveText('XL');
    });

    test('can change quantity', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("הוסיפו חולצה")');

        // Initial qty should be 1
        await expect(page.locator('.qty-display')).toHaveText('1');

        // Click + button
        const plusBtn = page.locator('.quantity-control button:has-text("+")');
        await plusBtn.click();
        await expect(page.locator('.qty-display')).toHaveText('2');

        await plusBtn.click();
        await expect(page.locator('.qty-display')).toHaveText('3');

        // Click - button
        const minusBtn = page.locator('.quantity-control button:nth-child(1)');
        await minusBtn.click();
        await expect(page.locator('.qty-display')).toHaveText('2');
    });

    test('can switch size category to kids', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("הוסיפו חולצה")');

        // Click kids tab
        await page.click('.size-cat-tab:has-text("ילדים")');

        // Should show kids sizes
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*2\s*$/ })).toBeVisible();
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*14\s*$/ })).toBeVisible();
        // Should NOT show adult sizes
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*XL\s*$/ })).not.toBeVisible();
    });

    test('can add multiple items', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("הוסיפו חולצה")');

        await expect(page.locator('.order-item')).toHaveCount(3);
    });

    test('can remove an item', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("הוסיפו חולצה")');

        await expect(page.locator('.order-item')).toHaveCount(2);

        // Remove first item
        await page.locator('.remove-item').first().click();
        await expect(page.locator('.order-item')).toHaveCount(1);
    });

    test('shows validation toast when submitting without family name', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("הוסיפו חולצה")');

        // Try to submit without family name
        await page.click('button:has-text("שליחת הזמנה")');

        // Should show toast
        await expect(page.locator('.toast')).toBeVisible();
        await expect(page.locator('.toast')).toHaveText('נא להזין שם משפחה');
    });

    test('shows validation toast when submitting without phone', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.fill('#familyName', 'כהן');
        await page.click('button:has-text("הוסיפו חולצה")');

        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.toast')).toHaveText('נא להזין טלפון');
    });

    test('shows validation toast when submitting with no items', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        await page.fill('#familyName', 'כהן');
        await page.fill('#familyContact', '050-1234567');

        // No submit button should be visible when no items
        await expect(page.locator('button:has-text("שליחת הזמנה")')).not.toBeVisible();
    });

    test('submit saves to localStorage when backend not configured', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');

        await page.fill('#familyName', 'טסט');
        await page.fill('#familyContact', '050-0000000');
        await page.click('button:has-text("הוסיפו חולצה")');

        // Fill member name
        await page.locator('.order-item input[placeholder="למי החולצה?"]').fill('אבא');

        // Submit
        await page.click('button:has-text("שליחת הזמנה")');

        // Should show success screen (localStorage fallback)
        await expect(page.locator('.success-screen')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=ההזמנה נשלחה בהצלחה')).toBeVisible();

        // Verify data saved to localStorage
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tshirt_orders') || '[]'));
        expect(saved.length).toBe(1);
        expect(saved[0].familyName).toBe('טסט');
        expect(saved[0].orders[0].memberName).toBe('אבא');
    });

    test('full order flow with mocked backend', async ({ page }) => {
        // Intercept the fetch to the backend
        await page.route('**/mock-backend**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, message: '3 items saved' }),
            });
        });

        await page.goto(BASE_URL + '/index.html');

        // Override the config URL to use our mock
        await page.evaluate(() => {
            CONFIG.APPS_SCRIPT_URL = 'https://mock-backend.test/api';
        });

        // Fill family details
        await page.fill('#familyName', 'ישראלי');
        await page.fill('#familyContact', '052-9876543');

        // Add first shirt - for Dad
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').first().fill('אבא');
        await page.locator('.order-item select').first().selectOption('חולצת טריקו שרוול קצר');
        await page.locator('.order-item .color-option:has-text("כחול נייבי")').first().click();
        await page.locator('.order-item .size-btn:has-text("L")').first().click();

        // Add second shirt - for Mom
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item').nth(1).locator('input[placeholder="למי החולצה?"]').fill('אמא');
        await page.locator('.order-item').nth(1).locator('.size-cat-tab:has-text("מבוגר")').click();
        await page.locator('.order-item').nth(1).locator('.size-btn').filter({ hasText: /^\s*S\s*$/ }).click();

        // Add third shirt - for kid
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item').nth(2).locator('input[placeholder="למי החולצה?"]').fill('ילד');
        await page.locator('.order-item').nth(2).locator('.size-cat-tab:has-text("ילדים")').click();
        await page.locator('.order-item').nth(2).locator('.size-btn:has-text("10")').click();

        // Verify summary shows 3 shirts
        await expect(page.locator('text=3 חולצות')).toBeVisible();

        // Submit
        await page.click('button:has-text("שליחת הזמנה")');

        // Should show success screen
        await expect(page.locator('.success-screen')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=ההזמנה נשלחה בהצלחה')).toBeVisible();
        await expect(page.locator('text=ישראלי')).toBeVisible();
    });

    test('family name persists after adding items (state bug check)', async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');

        await page.fill('#familyName', 'לוי');
        await page.fill('#familyContact', '054-1111111');

        // Add item - this triggers render() which re-creates the DOM
        await page.click('button:has-text("הוסיפו חולצה")');

        // Name should still be there
        await expect(page.locator('#familyName')).toHaveValue('לוי');
        await expect(page.locator('#familyContact')).toHaveValue('054-1111111');

        // Type more into name AFTER adding item
        await page.locator('#familyName').fill('לוי-שרון');

        // Add another item
        await page.click('button:has-text("הוסיפו חולצה")');

        // Should persist the updated name
        await expect(page.locator('#familyName')).toHaveValue('לוי-שרון');
    });
});

test.describe('Admin Dashboard (admin.html)', () => {

    test('shows login screen', async ({ page }) => {
        await page.goto(BASE_URL + '/admin.html');
        await expect(page.locator('text=כניסת מנהל')).toBeVisible();
        await expect(page.locator('#pwInput')).toBeVisible();
    });

    test('rejects wrong password', async ({ page }) => {
        await page.goto(BASE_URL + '/admin.html');
        await page.fill('#pwInput', 'wrongpassword');
        await page.click('button:has-text("כניסה")');

        await expect(page.locator('.toast:has-text("שגויה")')).toBeVisible();
        // Should stay on login
        await expect(page.locator('#pwInput')).toBeVisible();
    });

    test('accepts correct password and shows dashboard', async ({ page }) => {
        await page.goto(BASE_URL + '/admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        // Should show dashboard (with "backend not configured" notice)
        await expect(page.locator('text=ניהול הזמנות חולצות')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.stat-card')).toHaveCount(4);
    });

    test('shows empty state with no backend', async ({ page }) => {
        await page.goto(BASE_URL + '/admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        // Stats should show zeros
        await expect(page.locator('.stat-card .number').first()).toHaveText('0');

        // Toast about backend
        await expect(page.locator('.toast')).toBeVisible();
    });

    test('can switch between tabs', async ({ page }) => {
        await page.goto(BASE_URL + '/admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        await expect(page.locator('.tab.active')).toHaveText('לפי משפחות');

        await page.click('.tab:has-text("פירוט להזמנה")');
        await expect(page.locator('.tab:has-text("פירוט להזמנה")')).toHaveClass(/active/);

        await page.click('.tab:has-text("כל הפריטים")');
        await expect(page.locator('.tab:has-text("כל הפריטים")')).toHaveClass(/active/);
    });

    test('login via Enter key', async ({ page }) => {
        await page.goto(BASE_URL + '/admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.press('#pwInput', 'Enter');

        await expect(page.locator('text=ניהול הזמנות חולצות')).toBeVisible({ timeout: 5000 });
    });
});
