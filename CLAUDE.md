# Family T-Shirt Order System — CLAUDE.md

## Project Overview
A web-based ordering system for families to order custom printed t-shirts from **B-Good** (bgood1.co.il). Built as static HTML + JS, hosted on **GitHub Pages**, with localStorage for persistence and optional Google Sheets backend.

**Live URL:** https://adiel-sharabi.github.io/family-tshirt-order/
**Repo:** https://github.com/Adiel-Sharabi/family-tshirt-order
**Branch:** master

## Architecture

### Files
| File | Purpose |
|------|---------|
| `index.html` | Public order form — families fill their own orders here |
| `admin.html` | Admin dashboard — view/edit/delete all orders, export CSV, print |
| `config.js` | Shared config + catalog data (shirt types, sizes, colors from B-Good) |
| `google-apps-script.js` | Google Apps Script backend code (NOT deployed yet) |
| `tests/order-flow.spec.js` | 42 Playwright e2e tests |
| `playwright.config.js` | Playwright config |

### Data Flow
- **No backend configured yet** — `CONFIG.APPS_SCRIPT_URL` is still `'YOUR_APPS_SCRIPT_URL_HERE'`
- Both pages detect this and fall back to **localStorage**
- Data stored in `localStorage` key `tshirt_orders` as an **object** keyed by order ID:
  ```json
  { "ord_123_abc": { id, familyName, familyContact, timestamp, lastModified, orders: [...] } }
  ```
- Family's browser also stores `my_order_id` to remember which order is theirs

### Order Form Flow (index.html)
1. **New visitor** → fresh form → add shirts → submit → success screen → data saved to localStorage
2. **Returning visitor** (has `my_order_id`) → welcome-back screen showing current order
3. **Edit** → click "עריכת ההזמנה" → pre-filled form with all items → modify → "עדכון הזמנה"
4. **New order** → click "הזמנה חדשה" → deletes old order, starts fresh

### Admin Flow (admin.html)
- Password: `bgood2024` (checked client-side via `CONFIG.ADMIN_PASSWORD`)
- 3 tabs: By families | Breakdown for B-Good | All items
- **Edit**: opens modal with full editing (add/remove/change items, change family details)
- **Delete**: removes entire family order
- Export: CSV, print, copy to clipboard
- Stats cards: families count, items, total shirts, unique sizes

## Key Technical Decisions
- localStorage data format is **object** (not array). Migration code in `getAllOrders()` auto-converts old array format.
- Admin edit/delete buttons use `data-id` attributes (not inline onclick strings) to avoid quote escaping issues with order IDs.
- `esc()` function escapes `& < > " '` for XSS safety in HTML templates.

## B-Good Catalog Data (in config.js)
- **12 shirt types**: טריקו short/long/3/4, אמריקאית short/long, V short/long, נשים, גופייה, בייסבול, קפוצ'ון, תינוק
- **30 colors**: from B-Good color chart (with hex values)
- **Sizes**: adult (XS-5XL), kids (2-16), baby (0-6m to 18-24m)

## Testing
```bash
cd C:/dev/family-tshirt-order
npx playwright test          # run all 42 tests
npx playwright test --headed # run with visible browser
```

### Test Coverage (42 tests)
| Category | Count | What |
|----------|-------|------|
| Basic UI | 7 | Add/remove items, colors, sizes, qty, categories |
| Validation | 3 | Missing name/phone, empty order |
| Submit & Save | 3 | localStorage persistence, multi-item, specific fields |
| Family Edit | 8 | Welcome-back, add/remove/change, cancel, timestamps |
| Migration | 1 | Old array→object auto-convert |
| Backend mock | 1 | Full flow with mocked API |
| Admin Login | 4 | Correct/wrong password, Enter key |
| Admin Display | 5 | Empty state, data display, tabs, breakdown |
| Admin Edit | 5 | Modal: add/remove/change items, cancel |
| Admin Delete | 2 | Delete one, keeps others |
| Integration | 3 | Form→admin, admin edit→form, admin delete→form |

## Remaining TODO
1. **Google Sheets backend** — user hasn't set up the Apps Script yet. When ready:
   - Create Google Sheet → Extensions → Apps Script → paste `google-apps-script.js`
   - Deploy as Web App (execute as me, anyone can access)
   - Paste URL into `config.js` → `APPS_SCRIPT_URL`
   - The code already handles both localStorage and remote backend seamlessly
2. **Limitation**: localStorage is per-browser/per-origin. On GitHub Pages, all families share the same origin. Each family only sees their own order (keyed by `my_order_id`), but the admin sees all. If families use different devices/browsers, their orders are independent — this is by design for the localStorage mode. The Google Sheets backend would centralize everything.

## Commands Reference
```bash
# Dev
start "" "C:/dev/family-tshirt-order/index.html"   # open locally
start "" "C:/dev/family-tshirt-order/admin.html"    # open admin locally

# Test
cd C:/dev/family-tshirt-order && npx playwright test

# Deploy
cd C:/dev/family-tshirt-order && git add -A && git commit -m "msg" && git push
# GitHub Pages auto-deploys from master branch
```

## Engineering Standards (shared, non-negotiable)
@ENGINEERING_STANDARDS.md
