const prisma = require('../lib/prisma');
const { exchangeCode, refreshAccessToken, getAppToken, getKrogerProfile, searchProducts, addItemsToCart } = require('../services/kroger');

const FRONTEND = 'http://localhost:5173';

const SAMPLE_RECIPES = [
  {
    title: 'Chicken & Rice Bowl',
    description: 'Grilled chicken thighs over jasmine rice with roasted veggies and a garlic soy glaze.',
    time: '35 min', servings: 4,
    ingredients: ['4 chicken thighs', '2 cups jasmine rice', '1 cup broccoli florets', '1 red bell pepper, sliced', '3 cloves garlic, minced', '3 tbsp soy sauce', '1 tbsp sesame oil', '1 tbsp olive oil', 'Salt and pepper to taste'],
  },
  {
    title: 'Turkey Taco Meal Prep',
    description: 'Seasoned ground turkey with black beans, corn, and salsa — great for wraps or bowls all week.',
    time: '25 min', servings: 5,
    ingredients: ['1.5 lbs ground turkey', '1 can black beans, drained', '1 cup frozen corn', '1 cup salsa', '1 packet taco seasoning', '1 tbsp olive oil', 'Salt and pepper to taste'],
  },
  {
    title: 'Salmon & Roasted Broccoli',
    description: 'Lemon-herb salmon fillets with crispy broccoli and brown rice. High protein, low effort.',
    time: '30 min', servings: 3,
    ingredients: ['3 salmon fillets', '3 cups broccoli florets', '1.5 cups brown rice', '2 tbsp olive oil', '1 lemon, sliced', '2 cloves garlic, minced', '1 tsp dried dill', 'Salt and pepper to taste'],
  },
  {
    title: 'Pasta Primavera',
    description: 'Penne with seasonal vegetables in a light olive oil and garlic sauce. Easy weeknight dinner.',
    time: '20 min', servings: 4,
    ingredients: ['12 oz penne pasta', '1 zucchini, sliced', '1 cup cherry tomatoes', '1 yellow bell pepper, chopped', '4 cloves garlic, minced', '3 tbsp olive oil', '1/4 cup parmesan cheese', 'Fresh basil to taste', 'Salt and pepper to taste'],
  },
  {
    title: 'Greek Chicken Bowls',
    description: 'Marinated chicken with cucumber, tomato, feta, olives, and tzatziki over quinoa.',
    time: '40 min', servings: 4,
    ingredients: ['4 chicken breasts', '1.5 cups quinoa', '1 cucumber, diced', '1 cup cherry tomatoes, halved', '1/2 cup kalamata olives', '1/2 cup feta cheese, crumbled', '1/2 cup tzatziki sauce', '2 tbsp olive oil', '1 tsp dried oregano', 'Salt and pepper to taste'],
  },
  {
    title: 'Beef & Vegetable Stir Fry',
    description: 'Tender beef strips with bell peppers, snap peas, and carrots in a savory stir fry sauce.',
    time: '20 min', servings: 3,
    ingredients: ['1 lb beef sirloin, thinly sliced', '1 cup snap peas', '1 red bell pepper, sliced', '2 carrots, julienned', '3 cloves garlic, minced', '2 tbsp soy sauce', '1 tbsp oyster sauce', '1 tsp cornstarch', '1 tbsp sesame oil', '2 cups cooked rice'],
  },
];

function getAuthUrl(state) {
  const params = new URLSearchParams({
    scope: 'cart.basic:write profile.compact',
    response_type: 'code',
    client_id: process.env.KROGER_CLIENT_ID,
    redirect_uri: process.env.KROGER_REDIRECT_URI,
    state,
  });
  return `https://api.kroger.com/v1/connect/oauth2/authorize?${params}`;
}

async function getValidAccessToken(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.krogerAccessToken) throw new Error('Kroger account not connected');

  if (user.krogerTokenExpiry && new Date() >= user.krogerTokenExpiry) {
    const tokens = await refreshAccessToken(user.krogerRefreshToken);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        krogerAccessToken: tokens.access_token,
        krogerRefreshToken: tokens.refresh_token || user.krogerRefreshToken,
        krogerTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return updated.krogerAccessToken;
  }

  return user.krogerAccessToken;
}

const connectKroger = (req, res) => {
  res.redirect(getAuthUrl('connect'));
};

const loginWithKroger = (req, res) => {
  res.redirect(getAuthUrl('login'));
};

const krogerCallback = async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    const dest = state === 'login' ? `${FRONTEND}/?kroger=error` : `${FRONTEND}/cart?kroger=error`;
    return res.redirect(dest);
  }

  try {
    const tokens = await exchangeCode(code);
    const tokenData = {
      krogerAccessToken: tokens.access_token,
      krogerRefreshToken: tokens.refresh_token,
      krogerTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    };

    if (state === 'login') {
      const payload = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64').toString());
      const krogerUserId = payload.sub;
      const profile = await getKrogerProfile(tokens.access_token).catch(() => null);
      const email = profile?.profile?.email;
      const name = [profile?.profile?.firstName, profile?.profile?.lastName].filter(Boolean).join(' ') || 'Kroger User';

      let user = await prisma.user.findUnique({ where: { krogerUserId } });

      if (!user && email) {
        user = await prisma.user.findUnique({ where: { email } }).catch(() => null);
      }

      if (user) {
        user = await prisma.user.update({ where: { id: user.id }, data: { krogerUserId, ...tokenData } });
      } else {
        user = await prisma.user.create({
          data: { name, email: email || null, krogerUserId, ...tokenData },
        });
        await Promise.all(
          SAMPLE_RECIPES.map((recipe) => prisma.recipe.create({ data: { ...recipe, userId: user.id } }))
        );
      }

      req.session.userId = user.id;
      return req.session.save(() => res.redirect(`${FRONTEND}/?kroger=welcome`));
    }

    if (!req.session.userId) return res.redirect(`${FRONTEND}/cart?kroger=error`);

    const profile = await getKrogerProfile(tokens.access_token).catch(() => null);
    const syncData = profile ? {
      krogerUserId: profile.id,
      name: [profile.profile?.firstName, profile.profile?.lastName].filter(Boolean).join(' ') || undefined,
      email: profile.profile?.email || undefined,
    } : {};

    await prisma.user.update({ where: { id: req.session.userId }, data: { ...tokenData, ...syncData } });
    res.redirect(`${FRONTEND}/cart?kroger=connected`);
  } catch (err) {
    console.error('Kroger callback error:', err.message);
    const dest = state === 'login' ? `${FRONTEND}/?kroger=error` : `${FRONTEND}/cart?kroger=error`;
    res.redirect(dest);
  }
};

const searchIngredients = async (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients?.length) return res.status(400).json({ error: 'No ingredients provided' });

  let appToken;
  try {
    appToken = await getAppToken();
  } catch {
    return res.status(502).json({ error: 'Failed to connect to Kroger' });
  }

  const results = await Promise.all(
    ingredients.map(async (ingredient) => ({
      ingredient,
      products: await searchProducts(ingredient, appToken),
    }))
  );

  res.json({ results });
};

const sendToKroger = async (req, res) => {
  let accessToken;
  try {
    accessToken = await getValidAccessToken(req.session.userId);
  } catch {
    return res.status(400).json({ error: 'Kroger account not connected' });
  }

  const { items } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'No items provided' });

  const success = await addItemsToCart(items, accessToken);
  if (!success) return res.status(502).json({ error: 'Failed to add items to Kroger cart' });

  res.json({ added: items.length });
};

module.exports = { connectKroger, loginWithKroger, krogerCallback, searchIngredients, sendToKroger };
