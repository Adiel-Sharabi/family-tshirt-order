// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/');

test.describe('Order Form (index.html)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL + '/index.html');
        // Clear localStorage to start fresh
        await page.evaluate(() => { localStorage.clear(); });
        await page.goto(BASE_URL + '/index.html');
    });

    test('page loads and shows title', async ({ page }) => {
        await expect(page.locator('#pageTitle')).toBeVisible();
        await expect(page.locator('#pageTitle')).toHaveText('הזמנת חולצות משפחתית');
    });

    test('shows "add shirt" button initially', async ({ page }) => {
        await expect(page.getByRole('button', { name: '+ הוסיפו חולצה' })).toBeVisible();
    });

    test('can add a shirt item', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('.order-item')).toHaveCount(1);
        await expect(page.locator('.item-number')).toHaveText('1');
    });

    test('can fill family details and they persist after adding item', async ({ page }) => {
        await page.fill('#familyName', 'כהן');
        await page.fill('#familyContact', '050-1234567');
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('#familyName')).toHaveValue('כהן');
        await expect(page.locator('#familyContact')).toHaveValue('050-1234567');
    });

    test('can select color by clicking', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('.color-option:has-text("שחור")');
        await expect(page.locator('.color-option.selected:has-text("שחור")')).toBeVisible();
    });

    test('can select size by clicking', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('.size-btn:has-text("XL"):not(:has-text("2XL"))');
        await expect(page.locator('.size-btn.selected')).toHaveText('XL');
    });

    test('can change quantity', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('.qty-display')).toHaveText('1');
        await page.locator('.quantity-control button:has-text("+")').click();
        await expect(page.locator('.qty-display')).toHaveText('2');
        await page.locator('.quantity-control button:has-text("+")').click();
        await expect(page.locator('.qty-display')).toHaveText('3');
    });

    test('can switch size category to kids', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('.size-cat-tab:has-text("ילדים")');
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*2\s*$/ })).toBeVisible();
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*14\s*$/ })).toBeVisible();
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*XL\s*$/ })).not.toBeVisible();
    });

    test('can add multiple items', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('.order-item')).toHaveCount(3);
    });

    test('can remove an item', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('.order-item')).toHaveCount(2);
        await page.locator('.remove-item').first().click();
        await expect(page.locator('.order-item')).toHaveCount(1);
    });

    test('shows validation toast when submitting without family name', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.toast')).toHaveText('נא להזין שם משפחה');
    });

    test('shows validation toast when submitting without phone', async ({ page }) => {
        await page.fill('#familyName', 'כהן');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.toast')).toHaveText('נא להזין טלפון');
    });

    test('no submit button when no items', async ({ page }) => {
        await page.fill('#familyName', 'כהן');
        await page.fill('#familyContact', '050-1234567');
        await expect(page.locator('button:has-text("שליחת הזמנה")')).not.toBeVisible();
    });

    test('submit saves to localStorage and shows success', async ({ page }) => {
        await page.fill('#familyName', 'טסט');
        await page.fill('#familyContact', '050-0000000');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').fill('אבא');
        await page.click('button:has-text("שליחת הזמנה")');

        await expect(page.locator('.success-screen')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=ההזמנה נשלחה בהצלחה')).toBeVisible();

        // Verify localStorage
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tshirt_orders') || '{}'));
        const keys = Object.keys(saved);
        expect(keys.length).toBe(1);
        expect(saved[keys[0]].familyName).toBe('טסט');

        const myId = await page.evaluate(() => localStorage.getItem('my_order_id'));
        expect(myId).toBe(keys[0]);
    });

    test('returning family sees welcome back screen', async ({ page }) => {
        // Submit an order first
        await page.fill('#familyName', 'לוי');
        await page.fill('#familyContact', '052-1111111');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').fill('דנה');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        // Reload the page — should see welcome back
        await page.goto(BASE_URL + '/index.html');
        await expect(page.locator('.welcome-back')).toBeVisible();
        await expect(page.locator('text=שלום משפחת לוי')).toBeVisible();
    });

    test('can edit existing order from welcome back screen', async ({ page }) => {
        // Submit initial order
        await page.fill('#familyName', 'כהן');
        await page.fill('#familyContact', '050-9999999');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').fill('יוסי');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        // Go back to view
        await page.goto(BASE_URL + '/index.html');
        await expect(page.locator('.welcome-back')).toBeVisible();

        // Click edit
        await page.click('button:has-text("עריכת ההזמנה")');

        // Should be in edit mode with data pre-filled
        await expect(page.locator('.edit-badge')).toBeVisible();
        await expect(page.locator('#familyName')).toHaveValue('כהן');
        await expect(page.locator('.order-item')).toHaveCount(1);

        // Add another item
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('.order-item')).toHaveCount(2);

        // Submit the update
        await page.click('button:has-text("עדכון הזמנה")');
        await expect(page.locator('text=ההזמנה עודכנה בהצלחה')).toBeVisible();

        // Verify localStorage has 2 items now
        const saved = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders') || '{}');
            const key = Object.keys(data)[0];
            return data[key].orders.length;
        });
        expect(saved).toBe(2);
    });

    test('can start a new order from welcome back (deletes old one)', async ({ page }) => {
        // Submit initial order
        await page.fill('#familyName', 'אברהם');
        await page.fill('#familyContact', '050-1111111');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        // Reload
        await page.goto(BASE_URL + '/index.html');
        await expect(page.locator('.welcome-back')).toBeVisible();

        // Accept the confirm dialog
        page.on('dialog', dialog => dialog.accept());
        await page.click('button:has-text("הזמנה חדשה")');

        // Should see fresh form
        await expect(page.locator('#familyName')).toHaveValue('');
        await expect(page.locator('.order-item')).toHaveCount(0);
    });

    test('full order flow with mocked backend', async ({ page }) => {
        await page.route('**/mock-backend**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, message: '3 items saved' }),
            });
        });

        await page.evaluate(() => {
            CONFIG.APPS_SCRIPT_URL = 'https://mock-backend.test/api';
        });

        await page.fill('#familyName', 'ישראלי');
        await page.fill('#familyContact', '052-9876543');

        // Add Dad
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').first().fill('אבא');
        await page.locator('.order-item .color-option:has-text("כחול נייבי")').first().click();
        await page.locator('.order-item .size-btn:has-text("L")').first().click();

        // Add Mom
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item').nth(1).locator('input[placeholder="למי החולצה?"]').fill('אמא');
        await page.locator('.order-item').nth(1).locator('.size-btn').filter({ hasText: /^\s*S\s*$/ }).click();

        // Add Kid
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item').nth(2).locator('input[placeholder="למי החולצה?"]').fill('ילד');
        await page.locator('.order-item').nth(2).locator('.size-cat-tab:has-text("ילדים")').click();
        await page.locator('.order-item').nth(2).locator('.size-btn:has-text("10")').click();

        await expect(page.locator('text=3 חולצות')).toBeVisible();
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=ישראלי')).toBeVisible();
    });

    test('family name persists after adding items (state bug check)', async ({ page }) => {
        await page.fill('#familyName', 'לוי');
        await page.fill('#familyContact', '054-1111111');
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('#familyName')).toHaveValue('לוי');
        await page.locator('#familyName').fill('לוי-שרון');
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('#familyName')).toHaveValue('לוי-שרון');
    });
});

test.describe('Admin Dashboard (admin.html)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL + '/admin.html');
        await page.evaluate(() => { localStorage.clear(); });
        await page.goto(BASE_URL + '/admin.html');
    });

    test('shows login screen', async ({ page }) => {
        await expect(page.locator('text=כניסת מנהל')).toBeVisible();
        await expect(page.locator('#pwInput')).toBeVisible();
    });

    test('rejects wrong password', async ({ page }) => {
        await page.fill('#pwInput', 'wrongpassword');
        await page.click('button:has-text("כניסה")');
        await expect(page.locator('.toast:has-text("שגויה")')).toBeVisible();
        await expect(page.locator('#pwInput')).toBeVisible();
    });

    test('accepts correct password and shows dashboard', async ({ page }) => {
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await expect(page.locator('text=ניהול הזמנות חולצות')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.stat-card')).toHaveCount(4);
    });

    test('shows empty state with no orders', async ({ page }) => {
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await expect(page.locator('.stat-card .number').first()).toHaveText('0');
    });

    test('can switch between tabs', async ({ page }) => {
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await expect(page.locator('.tab.active')).toHaveText('לפי משפחות');
        await page.click('.tab:has-text("פירוט להזמנה")');
        await expect(page.locator('.tab:has-text("פירוט להזמנה")')).toHaveClass(/active/);
        await page.click('.tab:has-text("כל הפריטים")');
        await expect(page.locator('.tab:has-text("כל הפריטים")')).toHaveClass(/active/);
    });

    test('login via Enter key', async ({ page }) => {
        await page.fill('#pwInput', 'bgood2024');
        await page.press('#pwInput', 'Enter');
        await expect(page.locator('text=ניהול הזמנות חולצות')).toBeVisible({ timeout: 5000 });
    });

    test('displays orders from localStorage', async ({ page }) => {
        // Pre-populate localStorage with an order
        await page.evaluate(() => {
            const data = {
                'ord_test1': {
                    id: 'ord_test1',
                    familyName: 'טסט',
                    familyContact: '050-000',
                    timestamp: '16.4.2026, 10:00',
                    lastModified: '16.4.2026, 10:00',
                    orders: [
                        { memberName: 'אבא', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'L', quantity: 2, notes: '' },
                        { memberName: 'אמא', shirtType: 'חולצת נשים שרוול קצר', color: 'שחור', sizeCategory: 'adult', size: 'S', quantity: 1, notes: '' },
                    ],
                }
            };
            localStorage.setItem('tshirt_orders', JSON.stringify(data));
        });

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        // Should show 1 family, 2 items, 3 total shirts
        await expect(page.locator('.stat-card .number').nth(0)).toHaveText('1');
        await expect(page.locator('.stat-card .number').nth(1)).toHaveText('2');
        await expect(page.locator('.stat-card .number').nth(2)).toHaveText('3');

        // Should show family name
        await expect(page.locator('text=משפחת טסט')).toBeVisible();
    });

    test('admin can edit a family order', async ({ page }) => {
        // Pre-populate
        await page.evaluate(() => {
            localStorage.setItem('tshirt_orders', JSON.stringify({
                'ord_edit1': {
                    id: 'ord_edit1',
                    familyName: 'לעריכה',
                    familyContact: '050-111',
                    timestamp: '16.4.2026, 10:00',
                    lastModified: '16.4.2026, 10:00',
                    orders: [
                        { memberName: 'ילד1', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'kids', size: '10', quantity: 1, notes: '' },
                    ],
                }
            }));
        });

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        // Click edit
        await page.click('button:has-text("עריכה")');

        // Modal should appear
        await expect(page.locator('.modal')).toBeVisible();
        await expect(page.locator('.modal h2')).toContainText('לעריכה');

        // Add a new item in the modal
        await page.click('.modal button:has-text("+ הוסף פריט")');
        await expect(page.locator('.modal-item')).toHaveCount(2);

        // Save
        await page.click('.modal button:has-text("שמור שינויים")');

        // Modal should close
        await expect(page.locator('.modal')).not.toBeVisible();

        // Should now show 2 items
        await expect(page.locator('.stat-card .number').nth(1)).toHaveText('2');
        await expect(page.locator('.toast:has-text("עודכנה")')).toBeVisible();
    });

    test('admin can delete a family order', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.setItem('tshirt_orders', JSON.stringify({
                'ord_del1': {
                    id: 'ord_del1',
                    familyName: 'למחיקה',
                    familyContact: '050-222',
                    timestamp: '16.4.2026',
                    lastModified: '16.4.2026',
                    orders: [
                        { memberName: 'X', shirtType: 'חולצת טריקו שרוול קצר', color: 'שחור', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' },
                    ],
                }
            }));
        });

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        await expect(page.locator('text=משפחת למחיקה')).toBeVisible();

        page.on('dialog', dialog => dialog.accept());
        await page.click('button:has-text("מחיקה")');

        await expect(page.locator('text=משפחת למחיקה')).not.toBeVisible();
        await expect(page.locator('.stat-card .number').first()).toHaveText('0');
    });
});
