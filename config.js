// ==========================================================
// CONFIGURATION - Update this after setting up Google Apps Script
// ==========================================================
const CONFIG = {
    // Paste your Google Apps Script Web App URL here:
    APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_URL_HERE',

    // Admin password (must match ADMIN_PASSWORD in Google Apps Script):
    ADMIN_PASSWORD: 'bgood2024',

    // Order form title:
    TITLE: 'הזמנת חולצות משפחתית',
    SUBTITLE: 'בחרו את הגדלים והצבעים המתאימים לכם',

    // Set to false to close orders:
    ORDERS_OPEN: true,
    CLOSED_MESSAGE: 'ההזמנות נסגרו. תודה לכולם!',
};

// ===== Shared catalog data =====
const SHIRT_TYPES = [
    { id: 'tshirt-short', name: 'חולצת טריקו שרוול קצר', category: 'all' },
    { id: 'tshirt-long', name: 'חולצת טריקו שרוול ארוך', category: 'all' },
    { id: 'tshirt-34', name: 'חולצת טריקו שרוול 3/4', category: 'all' },
    { id: 'american-short', name: 'חולצה אמריקאית שרוול קצר', category: 'all' },
    { id: 'american-long', name: 'חולצה אמריקאית שרוול ארוך', category: 'all' },
    { id: 'vneck-short', name: 'חולצת V שרוול קצר', category: 'all' },
    { id: 'vneck-long', name: 'חולצת V שרוול ארוך', category: 'all' },
    { id: 'women-short', name: 'חולצת נשים שרוול קצר', category: 'women' },
    { id: 'tank', name: 'גופייה', category: 'all' },
    { id: 'baseball', name: 'חולצת בייסבול', category: 'all' },
    { id: 'hoodie', name: "קפוצ'ון עם כיס קנגורו", category: 'all' },
    { id: 'baby', name: 'בגד תינוק', category: 'baby' },
];

const SIZES = {
    adult: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    kids: ['2', '4', '6', '8', '10', '12', '14', '16'],
    baby: ['0-6m', '6-12m', '12-18m', '18-24m'],
};

const COLORS = {
    'לבן': '#FFFFFF',
    'שחור': '#000000',
    'אפור אמריקאי': '#8C8C8C',
    'אפור עכבר': '#646464',
    'אפור מרנגו': '#4B4B4B',
    'קרם': '#FFFDD0',
    'כחול נייבי': '#000080',
    'כחול רויאל': '#4169E1',
    'תכלת': '#87CEEB',
    'טורקיז': '#40E0D0',
    'טורקיז בהיר': '#7FFFD4',
    'אדום': '#FF0000',
    'בורדו': '#800020',
    'כתום': '#FF8C00',
    'צהוב': '#FFD700',
    'צהוב לימון': '#FFF44F',
    'חרדל': '#FFDB58',
    'ירוק בנטון': '#00A86B',
    'ירוק בקבוק': '#006A4E',
    'ירוק זית': '#556B2F',
    'ירוק דשא': '#7CFC00',
    'ירוק תפוח': '#8DB600',
    'ירוק מנטה': '#98FF98',
    'ורוד פוקסיה': '#FF00FF',
    'ורוד בייבי': '#FFB6C1',
    'סגול חציל': '#614051',
    'סגול לילך': '#C8A2C8',
    'סגול גבעתי': '#9370DB',
    'חום': '#8B4513',
    'אפרסק': '#FFCBA4',
};

const SIZE_CATEGORY_LABELS = {
    adult: 'מבוגר',
    kids: 'ילדים',
    baby: 'תינוק',
};
