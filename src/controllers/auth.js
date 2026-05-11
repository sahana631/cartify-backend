const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

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

const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res.status(409).json({ error: 'An account with that email already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });

  await Promise.all(
    SAMPLE_RECIPES.map((recipe) =>
      prisma.recipe.create({ data: { ...recipe, userId: user.id } })
    )
  );

  req.session.userId = user.id;
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password)
    return res.status(401).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ error: 'Invalid email or password' });

  req.session.userId = user.id;
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });
    res.json({ id: user.id, name: user.name, email: user.email });
  });
};

const updateProfile = async (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Not logged in' });

  const { name, email, currentPassword, newPassword } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!email && user.password)
    return res.status(400).json({ error: 'Email is required' });

  if (email) {
    const emailTaken = await prisma.user.findFirst({ where: { email, NOT: { id: user.id } } });
    if (emailTaken) return res.status(409).json({ error: 'That email is already in use' });
  }

  const data = { name, email: email || null };

  if (newPassword) {
    if (!currentPassword)
      return res.status(400).json({ error: 'Current password is required to set a new one' });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(401).json({ error: 'Current password is incorrect' });
    data.password = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  res.json({ id: updated.id, name: updated.name, email: updated.email });
};

const logout = (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
};

const me = async (req, res) => {
  if (!req.session.userId)
    return res.status(401).json({ error: 'Not logged in' });

  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, krogerConnected: !!user.krogerAccessToken, krogerOnly: !user.password });
};

module.exports = { register, login, logout, me, updateProfile };
