const BASE = 'https://api.kroger.com/v1';

const INGREDIENT_ALIASES = {
  'pepper': 'black pepper',
  'chili': 'chili powder',
  'chilli': 'chili powder',
  'oil': 'vegetable oil',
  'flour': 'all purpose flour',
  'sugar': 'granulated sugar',
  'stock': 'chicken stock',
  'broth': 'chicken broth',
  'milk': 'whole milk',
  'butter': 'unsalted butter',
  'cream': 'heavy cream',
  'herbs': 'mixed herbs',
  'seasoning': 'all purpose seasoning',
};

function stripMeasurement(ingredient) {
  return ingredient
    .replace(/^\d+(\s*\d+\/\d+|\.\d+|\/\d+)?\s*/i, '')
    .replace(/^(cups?|tbsps?|tsps?|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|liters?|litres?|pinch(es)?|dash(es)?|cloves?|cans?|bunches?|heads?|slices?|pieces?|stalks?|sprigs?|packets?|fillets?)\s+/i, '')
    .replace(/,.*$/, '')
    .trim();
}

function normalizeIngredient(ingredient) {
  const stripped = stripMeasurement(ingredient).toLowerCase();
  return INGREDIENT_ALIASES[stripped] || stripped;
}

function basicAuth() {
  const creds = `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
}

async function getAppToken() {
  const res = await fetch(`${BASE}/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'product.compact',
    }),
  });
  if (!res.ok) throw new Error('Failed to get Kroger app token');
  const data = await res.json();
  return data.access_token;
}

async function exchangeCode(code) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  console.log('Exchanging Kroger code...');
  console.log('redirect_uri:', process.env.KROGER_REDIRECT_URI);

  try {
    const res = await fetch(`${BASE}/connect/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: basicAuth(),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.KROGER_REDIRECT_URI,
      }),
      signal: controller.signal,
    });
    const text = await res.text();
    console.log('Kroger token response:', res.status, text);
    if (!res.ok) throw new Error(`Kroger token exchange failed: ${text}`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${BASE}/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuth(),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error('Failed to refresh Kroger token');
  return res.json();
}

const OUT_OF_STOCK_LEVELS = new Set(['OUT_OF_STOCK', 'TEMPORARILY_OUT_OF_STOCK']);

async function searchProducts(term, accessToken, limit = 3) {
  // Request extra candidates so filtering doesn't leave us short
  const params = new URLSearchParams({
    'filter.term': normalizeIngredient(term),
    'filter.limit': String(limit * 3),
    'filter.fulfillment': 'ais',
  });
  const res = await fetch(`${BASE}/products?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || [])
    .filter((p) => {
      const item = p.items?.[0];
      if (!item) return false;
      if (OUT_OF_STOCK_LEVELS.has(item.inventory?.stockLevel)) return false;
      return item.price?.regular != null;
    })
    .slice(0, limit)
    .map((p) => {
      const featuredImg = p.images?.find((img) => img.featured) || p.images?.[0];
      const image = featuredImg?.sizes?.find((s) => s.size === 'thumbnail')?.url || featuredImg?.sizes?.[0]?.url;
      const price = p.items?.[0]?.price?.regular;
      return { upc: p.upc, name: p.description, image, price };
    });
}

async function addItemsToCart(items, accessToken) {
  const payload = items.map(({ upc, quantity }) => ({ upc, quantity }));
  console.log('Adding to Kroger cart:', JSON.stringify(payload));
  const res = await fetch(`${BASE}/cart/add`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ items: payload }),
  });
  const text = await res.text();
  console.log('Kroger cart response:', res.status, text);
  return res.ok;
}

async function getKrogerProfile(accessToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE}/identity/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('Failed to fetch Kroger profile');
    const data = await res.json();
    return data.data;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { exchangeCode, refreshAccessToken, getAppToken, getKrogerProfile, searchProducts, addItemsToCart };
