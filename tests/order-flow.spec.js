// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/');

// Helper: clear localStorage before each test
async function freshPage(page, file = 'index.html') {
    await page.goto(BASE_URL + '/' + file);
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL + '/' + file);
}

// Helper: submit an order quickly
async function submitQuickOrder(page, familyName, phone, memberName) {
    await page.fill('#familyName', familyName);
    await page.fill('#familyContact', phone);
    await page.click('button:has-text("הוסיפו חולצה")');
    if (memberName) {
        await page.locator('.order-item input[placeholder="למי החולצה?"]').first().fill(memberName);
    }
    await page.click('button:has-text("שליחת הזמנה")');
    await expect(page.locator('.success-screen')).toBeVisible({ timeout: 5000 });
}

// Helper: inject order data into localStorage
async function injectOrder(page, id, familyName, phone, items) {
    await page.evaluate(({ id, familyName, phone, items }) => {
        const data = JSON.parse(localStorage.getItem('tshirt_orders') || '{}');
        data[id] = {
            id,
            familyName,
            familyContact: phone,
            timestamp: '16.4.2026, 10:00',
            lastModified: '16.4.2026, 10:00',
            orders: items,
        };
        localStorage.setItem('tshirt_orders', JSON.stringify(data));
    }, { id, familyName, phone, items });
}

// =============================================
// ORDER FORM TESTS
// =============================================
test.describe('Order Form - Basic UI', () => {

    test.beforeEach(async ({ page }) => { await freshPage(page); });

    test('page loads with title and add button', async ({ page }) => {
        await expect(page.locator('#pageTitle')).toHaveText('הזמנת חולצות משפחתית');
        await expect(page.getByRole('button', { name: '+ הוסיפו חולצה' })).toBeVisible();
    });

    test('can add and remove shirt items', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('.order-item')).toHaveCount(3);

        await page.locator('.remove-item').first().click();
        await expect(page.locator('.order-item')).toHaveCount(2);

        await page.locator('.remove-item').first().click();
        await page.locator('.remove-item').first().click();
        await expect(page.locator('.order-item')).toHaveCount(0);
    });

    test('family details persist across re-renders', async ({ page }) => {
        await page.fill('#familyName', 'לוי');
        await page.fill('#familyContact', '054-1111111');
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('#familyName')).toHaveValue('לוי');
        await expect(page.locator('#familyContact')).toHaveValue('054-1111111');

        // Edit name then add another item
        await page.locator('#familyName').fill('לוי-שרון');
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('#familyName')).toHaveValue('לוי-שרון');
    });

    test('can select color', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('.color-option:has-text("שחור")');
        await expect(page.locator('.color-option.selected:has-text("שחור")')).toBeVisible();
    });

    test('can select size', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('.size-btn:has-text("XL"):not(:has-text("2XL"))');
        await expect(page.locator('.size-btn.selected')).toHaveText('XL');
    });

    test('can change quantity up and down', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await expect(page.locator('.qty-display')).toHaveText('1');
        await page.locator('.quantity-control button:has-text("+")').click();
        await page.locator('.quantity-control button:has-text("+")').click();
        await expect(page.locator('.qty-display')).toHaveText('3');
    });

    test('can switch size category to kids and back', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');

        // Switch to kids
        await page.click('.size-cat-tab:has-text("ילדים")');
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*2\s*$/ })).toBeVisible();
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*14\s*$/ })).toBeVisible();
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*XL\s*$/ })).not.toBeVisible();

        // Switch back to adult
        await page.click('.size-cat-tab:has-text("מבוגר")');
        await expect(page.locator('.size-btn').filter({ hasText: /^\s*XL\s*$/ })).toBeVisible();
    });
});

test.describe('Order Form - Validation', () => {

    test.beforeEach(async ({ page }) => { await freshPage(page); });

    test('rejects submit without family name', async ({ page }) => {
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.toast')).toHaveText('נא להזין שם משפחה');
    });

    test('rejects submit without phone', async ({ page }) => {
        await page.fill('#familyName', 'כהן');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.toast')).toHaveText('נא להזין טלפון');
    });

    test('no submit button when no items added', async ({ page }) => {
        await page.fill('#familyName', 'כהן');
        await page.fill('#familyContact', '050-1234567');
        await expect(page.locator('button:has-text("שליחת הזמנה")')).not.toBeVisible();
    });
});

test.describe('Order Form - Submit & Save', () => {

    test.beforeEach(async ({ page }) => { await freshPage(page); });

    test('submit saves to localStorage, shows success, and stores my_order_id', async ({ page }) => {
        await page.fill('#familyName', 'טסט');
        await page.fill('#familyContact', '050-0000000');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').fill('אבא');
        await page.click('button:has-text("שליחת הזמנה")');

        // Success screen
        await expect(page.locator('.success-screen')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=ההזמנה נשלחה בהצלחה')).toBeVisible();

        // Verify localStorage saved correctly
        const result = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders') || '{}');
            const myId = localStorage.getItem('my_order_id');
            const keys = Object.keys(data);
            return {
                keyCount: keys.length,
                myId,
                hasMyId: keys.includes(myId),
                familyName: keys.length > 0 ? data[keys[0]].familyName : null,
                memberName: keys.length > 0 ? data[keys[0]].orders[0].memberName : null,
                isObject: typeof data === 'object' && !Array.isArray(data),
            };
        });

        expect(result.keyCount).toBe(1);
        expect(result.hasMyId).toBe(true);
        expect(result.familyName).toBe('טסט');
        expect(result.memberName).toBe('אבא');
        expect(result.isObject).toBe(true);
    });

    test('submit with multiple items saves all', async ({ page }) => {
        await page.fill('#familyName', 'גדול');
        await page.fill('#familyContact', '050-2222222');

        // Add 3 items
        for (let i = 0; i < 3; i++) {
            await page.click('button:has-text("הוסיפו חולצה")');
        }
        await page.locator('.order-item').nth(0).locator('input[placeholder="למי החולצה?"]').fill('אח1');
        await page.locator('.order-item').nth(1).locator('input[placeholder="למי החולצה?"]').fill('אח2');
        await page.locator('.order-item').nth(2).locator('input[placeholder="למי החולצה?"]').fill('אח3');

        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        const itemCount = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            const key = Object.keys(data)[0];
            return data[key].orders.length;
        });
        expect(itemCount).toBe(3);
    });

    test('full order with specific selections saves correctly', async ({ page }) => {
        await page.fill('#familyName', 'ישראלי');
        await page.fill('#familyContact', '052-9876543');

        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').fill('אבא');
        await page.locator('.order-item .color-option:has-text("כחול נייבי")').first().click();
        await page.locator('.order-item .size-btn:has-text("L")').first().click();
        await page.locator('.quantity-control button:has-text("+")').click(); // qty = 2

        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        const saved = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            const key = Object.keys(data)[0];
            return data[key].orders[0];
        });
        expect(saved.color).toBe('כחול נייבי');
        expect(saved.size).toBe('L');
        expect(saved.quantity).toBe(2);
        expect(saved.memberName).toBe('אבא');
    });
});

test.describe('Order Form - Edit Flow (returning family)', () => {

    test.beforeEach(async ({ page }) => { await freshPage(page); });

    test('returning family sees welcome-back screen', async ({ page }) => {
        await submitQuickOrder(page, 'לוי', '052-1111111', 'דנה');
        await page.goto(BASE_URL + '/index.html');

        await expect(page.locator('.welcome-back')).toBeVisible();
        await expect(page.locator('text=שלום משפחת לוי')).toBeVisible();
        // Should show the order summary table
        await expect(page.locator('text=דנה')).toBeVisible();
    });

    test('can edit existing order - add items', async ({ page }) => {
        await submitQuickOrder(page, 'כהן', '050-9999999', 'יוסי');
        await page.goto(BASE_URL + '/index.html');

        // Click edit
        await page.click('button:has-text("עריכת ההזמנה")');
        await expect(page.locator('.edit-badge')).toBeVisible();
        await expect(page.locator('#familyName')).toHaveValue('כהן');
        await expect(page.locator('.order-item')).toHaveCount(1);

        // Add another shirt
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item').nth(1).locator('input[placeholder="למי החולצה?"]').fill('שרה');
        await expect(page.locator('.order-item')).toHaveCount(2);

        // Button should say "update" not "submit"
        await expect(page.locator('button:has-text("עדכון הזמנה")')).toBeVisible();

        // Submit update
        await page.click('button:has-text("עדכון הזמנה")');
        await expect(page.locator('text=ההזמנה עודכנה בהצלחה')).toBeVisible();

        // Verify 2 items saved
        const result = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            const key = Object.keys(data)[0];
            return { count: data[key].orders.length, names: data[key].orders.map(o => o.memberName) };
        });
        expect(result.count).toBe(2);
        expect(result.names).toContain('יוסי');
        expect(result.names).toContain('שרה');
    });

    test('can edit existing order - change size', async ({ page }) => {
        await submitQuickOrder(page, 'אברהם', '050-3333333', 'דן');
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("עריכת ההזמנה")');

        // Change to XL
        await page.click('.size-btn:has-text("XL"):not(:has-text("2XL"))');
        await page.click('button:has-text("עדכון הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        const saved = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            return data[Object.keys(data)[0]].orders[0].size;
        });
        expect(saved).toBe('XL');
    });

    test('can edit existing order - remove item', async ({ page }) => {
        // Submit with 2 items
        await page.fill('#familyName', 'רם');
        await page.fill('#familyContact', '050-4444444');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').fill('פריט1');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item').nth(1).locator('input[placeholder="למי החולצה?"]').fill('פריט2');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        // Edit - remove one
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("עריכת ההזמנה")');
        await expect(page.locator('.order-item')).toHaveCount(2);
        await page.locator('.remove-item').first().click();
        await expect(page.locator('.order-item')).toHaveCount(1);
        await page.click('button:has-text("עדכון הזמנה")');

        const saved = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            return data[Object.keys(data)[0]].orders.length;
        });
        expect(saved).toBe(1);
    });

    test('cancel edit returns to welcome-back', async ({ page }) => {
        await submitQuickOrder(page, 'שמש', '050-5555555', 'טל');
        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("עריכת ההזמנה")');
        await expect(page.locator('.edit-badge')).toBeVisible();

        // Cancel
        await page.click('button:has-text("ביטול עריכה")');
        await expect(page.locator('.welcome-back')).toBeVisible();
    });

    test('start new order deletes old one', async ({ page }) => {
        await submitQuickOrder(page, 'ישן', '050-6666666', 'X');
        await page.goto(BASE_URL + '/index.html');

        page.on('dialog', dialog => dialog.accept());
        await page.click('button:has-text("הזמנה חדשה")');

        await expect(page.locator('#familyName')).toHaveValue('');
        await expect(page.locator('.order-item')).toHaveCount(0);

        // Old order should be deleted
        const count = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('tshirt_orders') || '{}')).length);
        expect(count).toBe(0);
    });

    test('view order from success screen goes back to welcome', async ({ page }) => {
        await submitQuickOrder(page, 'צפייה', '050-7777777', 'A');
        await page.click('button:has-text("צפייה בהזמנה")');
        await expect(page.locator('.welcome-back')).toBeVisible();
        await expect(page.locator('text=שלום משפחת צפייה')).toBeVisible();
    });

    test('edit preserves lastModified timestamp', async ({ page }) => {
        await submitQuickOrder(page, 'זמן', '050-8888888', 'B');

        // Wait a bit so timestamps differ
        await page.waitForTimeout(100);

        await page.goto(BASE_URL + '/index.html');
        await page.click('button:has-text("עריכת ההזמנה")');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("עדכון הזמנה")');

        const result = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            const entry = data[Object.keys(data)[0]];
            return { hasTimestamp: !!entry.timestamp, hasLastModified: !!entry.lastModified };
        });
        expect(result.hasTimestamp).toBe(true);
        expect(result.hasLastModified).toBe(true);
    });
});

test.describe('Order Form - Migration from old format', () => {

    test('migrates old array format to object format', async ({ page }) => {
        // Simulate old array format
        await page.goto(BASE_URL + '/index.html');
        await page.evaluate(() => {
            localStorage.setItem('tshirt_orders', JSON.stringify([
                {
                    familyName: 'ישן',
                    familyContact: '050-000',
                    timestamp: '15.4.2026',
                    orders: [{ memberName: 'A', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' }],
                }
            ]));
        });
        await page.goto(BASE_URL + '/index.html');

        // Should still work - new order should save without error
        await page.fill('#familyName', 'חדש');
        await page.fill('#familyContact', '050-111');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        // Verify format is now object
        const result = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            return { isObject: typeof data === 'object' && !Array.isArray(data), keyCount: Object.keys(data).length };
        });
        expect(result.isObject).toBe(true);
        expect(result.keyCount).toBeGreaterThanOrEqual(2); // old migrated + new
    });
});

test.describe('Order Form - Backend mock', () => {

    test('full flow with mocked backend', async ({ page }) => {
        await freshPage(page);

        await page.route('**/mock-backend**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, message: 'saved' }),
            });
        });

        await page.evaluate(() => {
            CONFIG.APPS_SCRIPT_URL = 'https://mock-backend.test/api';
        });

        await page.fill('#familyName', 'ישראלי');
        await page.fill('#familyContact', '052-9876543');

        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').first().fill('אבא');
        await page.locator('.order-item .color-option:has-text("כחול נייבי")').first().click();
        await page.locator('.order-item .size-btn:has-text("L")').first().click();

        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item').nth(1).locator('input[placeholder="למי החולצה?"]').fill('ילד');
        await page.locator('.order-item').nth(1).locator('.size-cat-tab:has-text("ילדים")').click();
        await page.locator('.order-item').nth(1).locator('.size-btn:has-text("10")').click();

        await expect(page.locator('text=2 חולצות')).toBeVisible();
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=ישראלי')).toBeVisible();
    });
});

// =============================================
// ADMIN DASHBOARD TESTS
// =============================================
test.describe('Admin - Login', () => {

    test.beforeEach(async ({ page }) => { await freshPage(page, 'admin.html'); });

    test('shows login screen', async ({ page }) => {
        await expect(page.locator('text=כניסת מנהל')).toBeVisible();
    });

    test('rejects wrong password', async ({ page }) => {
        await page.fill('#pwInput', 'wrong');
        await page.click('button:has-text("כניסה")');
        await expect(page.locator('.toast:has-text("שגויה")')).toBeVisible();
        await expect(page.locator('#pwInput')).toBeVisible();
    });

    test('accepts correct password', async ({ page }) => {
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await expect(page.locator('text=ניהול הזמנות חולצות')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.stat-card')).toHaveCount(4);
    });

    test('login via Enter key works', async ({ page }) => {
        await page.fill('#pwInput', 'bgood2024');
        await page.press('#pwInput', 'Enter');
        await expect(page.locator('text=ניהול הזמנות חולצות')).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Admin - Dashboard display', () => {

    test('shows empty state', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await expect(page.locator('.stat-card .number').first()).toHaveText('0');
    });

    test('displays orders from localStorage correctly', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_a', 'כהן', '050-111', [
            { memberName: 'אבא', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'L', quantity: 2, notes: '' },
            { memberName: 'אמא', shirtType: 'חולצת נשים שרוול קצר', color: 'שחור', sizeCategory: 'adult', size: 'S', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        await expect(page.locator('.stat-card .number').nth(0)).toHaveText('1');  // families
        await expect(page.locator('.stat-card .number').nth(1)).toHaveText('2');  // items
        await expect(page.locator('.stat-card .number').nth(2)).toHaveText('3');  // total qty
        await expect(page.locator('text=משפחת כהן')).toBeVisible();
        await expect(page.locator('td:has-text("אבא")')).toBeVisible();
        await expect(page.locator('td:has-text("אמא")')).toBeVisible();
    });

    test('displays multiple families', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_1', 'כהן', '050-111', [
            { memberName: 'A', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' },
        ]);
        await injectOrder(page, 'ord_2', 'לוי', '050-222', [
            { memberName: 'B', shirtType: 'חולצת טריקו שרוול קצר', color: 'שחור', sizeCategory: 'kids', size: '10', quantity: 2, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        await expect(page.locator('.stat-card .number').nth(0)).toHaveText('2');
        await expect(page.locator('text=משפחת כהן')).toBeVisible();
        await expect(page.locator('text=משפחת לוי')).toBeVisible();
    });

    test('can switch between tabs', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        await expect(page.locator('.tab.active')).toHaveText('לפי משפחות');
        await page.click('.tab:has-text("פירוט להזמנה")');
        await expect(page.locator('.tab:has-text("פירוט להזמנה")')).toHaveClass(/active/);
        await page.click('.tab:has-text("כל הפריטים")');
        await expect(page.locator('.tab:has-text("כל הפריטים")')).toHaveClass(/active/);
    });

    test('breakdown tab groups by shirt type and color', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_x', 'A', '050-000', [
            { memberName: 'X', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'M', quantity: 2, notes: '' },
            { memberName: 'Y', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'L', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await page.click('.tab:has-text("פירוט להזמנה")');

        await expect(page.locator('.breakdown-item')).toHaveCount(1);
        await expect(page.locator('text=חולצת טריקו שרוול קצר')).toBeVisible();
    });
});

test.describe('Admin - Edit orders', () => {

    test('can open edit modal for a family', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_edit', 'לעריכה', '050-111', [
            { memberName: 'ילד1', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'kids', size: '10', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await page.click('button:has-text("עריכה")');

        await expect(page.locator('.modal')).toBeVisible();
        await expect(page.locator('.modal h2')).toContainText('לעריכה');
        await expect(page.locator('.modal-item')).toHaveCount(1);
    });

    test('can add item in edit modal', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_add', 'הוספה', '050-222', [
            { memberName: 'A', shirtType: 'חולצת טריקו שרוול קצר', color: 'שחור', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await page.click('button:has-text("עריכה")');

        await page.click('.modal button:has-text("+ הוסף פריט")');
        await expect(page.locator('.modal-item')).toHaveCount(2);

        await page.click('.modal button:has-text("שמור שינויים")');
        await expect(page.locator('.modal')).not.toBeVisible();
        await expect(page.locator('.stat-card .number').nth(1)).toHaveText('2');
        await expect(page.locator('.toast:has-text("עודכנה")')).toBeVisible();

        // Verify in localStorage
        const count = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            return data['ord_add'].orders.length;
        });
        expect(count).toBe(2);
    });

    test('can remove item in edit modal', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_rem', 'הסרה', '050-333', [
            { memberName: 'X', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' },
            { memberName: 'Y', shirtType: 'חולצת טריקו שרוול קצר', color: 'שחור', sizeCategory: 'adult', size: 'L', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await page.click('button:has-text("עריכה")');
        await expect(page.locator('.modal-item')).toHaveCount(2);

        await page.locator('.modal-item button:has-text("X")').first().click();
        await expect(page.locator('.modal-item')).toHaveCount(1);

        await page.click('.modal button:has-text("שמור שינויים")');
        await expect(page.locator('.stat-card .number').nth(1)).toHaveText('1');
    });

    test('can change fields in edit modal', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_chg', 'שינוי', '050-444', [
            { memberName: 'ישן', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await page.click('button:has-text("עריכה")');

        // Change member name
        await page.locator('.modal-item input').first().fill('חדש');
        // Change quantity
        await page.locator('.modal-item input[type="number"]').fill('5');

        await page.click('.modal button:has-text("שמור שינויים")');

        const saved = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            return data['ord_chg'].orders[0];
        });
        expect(saved.memberName).toBe('חדש');
        expect(saved.quantity).toBe(5);
    });

    test('close modal without saving preserves original data', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_cancel', 'ביטול', '050-555', [
            { memberName: 'מקורי', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await page.click('button:has-text("עריכה")');

        // Add item but cancel
        await page.click('.modal button:has-text("+ הוסף פריט")');
        await page.click('.modal button:has-text("ביטול")');
        await expect(page.locator('.modal')).not.toBeVisible();

        // Data should be unchanged
        const count = await page.evaluate(() => {
            const data = JSON.parse(localStorage.getItem('tshirt_orders'));
            return data['ord_cancel'].orders.length;
        });
        expect(count).toBe(1);
    });
});

test.describe('Admin - Delete orders', () => {

    test('can delete a family order', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_del', 'למחיקה', '050-666', [
            { memberName: 'X', shirtType: 'חולצת טריקו שרוול קצר', color: 'שחור', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await expect(page.locator('text=משפחת למחיקה')).toBeVisible();

        page.on('dialog', dialog => dialog.accept());
        await page.click('button:has-text("מחיקה")');

        await expect(page.locator('text=משפחת למחיקה')).not.toBeVisible();
        await expect(page.locator('.stat-card .number').first()).toHaveText('0');

        const count = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('tshirt_orders') || '{}')).length);
        expect(count).toBe(0);
    });

    test('delete one family keeps others intact', async ({ page }) => {
        await freshPage(page, 'admin.html');
        await injectOrder(page, 'ord_keep', 'נשאר', '050-111', [
            { memberName: 'A', shirtType: 'חולצת טריקו שרוול קצר', color: 'לבן', sizeCategory: 'adult', size: 'M', quantity: 1, notes: '' },
        ]);
        await injectOrder(page, 'ord_gone', 'נמחק', '050-222', [
            { memberName: 'B', shirtType: 'חולצת טריקו שרוול קצר', color: 'שחור', sizeCategory: 'adult', size: 'L', quantity: 1, notes: '' },
        ]);

        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        page.on('dialog', dialog => dialog.accept());
        // Delete the second family
        await page.locator('button:has-text("מחיקה")').nth(1).click();

        await expect(page.locator('.stat-card .number').first()).toHaveText('1');
        await expect(page.locator('text=משפחת נשאר')).toBeVisible();
        await expect(page.locator('text=משפחת נמחק')).not.toBeVisible();
    });
});

// =============================================
// CROSS-PAGE INTEGRATION
// =============================================
test.describe('Integration - Order Form + Admin', () => {

    test('order submitted in form appears in admin', async ({ page }) => {
        await freshPage(page);

        // Submit order
        await page.fill('#familyName', 'אינטגרציה');
        await page.fill('#familyContact', '050-9999999');
        await page.click('button:has-text("הוסיפו חולצה")');
        await page.locator('.order-item input[placeholder="למי החולצה?"]').fill('בדיקה');
        await page.locator('.order-item .color-option:has-text("אדום")').click();
        await page.locator('.order-item .size-btn').filter({ hasText: /^\s*L\s*$/ }).click();
        await page.click('button:has-text("שליחת הזמנה")');
        await expect(page.locator('.success-screen')).toBeVisible();

        // Go to admin
        await page.goto(BASE_URL + '/admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');

        await expect(page.locator('text=משפחת אינטגרציה')).toBeVisible();
        await expect(page.locator('td:has-text("בדיקה")')).toBeVisible();
        await expect(page.locator('.stat-card .number').nth(0)).toHaveText('1');
    });

    test('admin edit reflects when family returns to form', async ({ page }) => {
        await freshPage(page);

        // Family submits order
        await submitQuickOrder(page, 'עריכה-מנהל', '050-1010101', 'מקורי');

        // Admin edits
        await page.goto(BASE_URL + '/admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        await page.click('button:has-text("עריכה")');

        // Add a second item
        await page.click('.modal button:has-text("+ הוסף פריט")');
        await page.click('.modal button:has-text("שמור שינויים")');

        // Family returns to order form
        await page.goto(BASE_URL + '/index.html');
        await expect(page.locator('.welcome-back')).toBeVisible();
        // Should show 2 items now
        await expect(page.locator('text=2 חולצות')).toBeVisible();
    });

    test('admin delete clears family welcome-back', async ({ page }) => {
        await freshPage(page);

        // Family submits
        await submitQuickOrder(page, 'נמחק-מנהל', '050-2020202', 'X');

        // Admin deletes
        await page.goto(BASE_URL + '/admin.html');
        await page.fill('#pwInput', 'bgood2024');
        await page.click('button:has-text("כניסה")');
        page.on('dialog', dialog => dialog.accept());
        await page.click('button:has-text("מחיקה")');

        // Family returns - should see fresh form (order was deleted)
        await page.goto(BASE_URL + '/index.html');
        await expect(page.locator('.welcome-back')).not.toBeVisible();
        await expect(page.locator('#familyName')).toHaveValue('');
    });
});
