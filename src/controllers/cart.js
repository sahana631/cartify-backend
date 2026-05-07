const prisma = require('../lib/prisma');

// Temporary hardcoded userId — will come from auth session once login is set up
const TEMP_USER_ID = 1;

const getCart = async (req, res) => {
  const items = await prisma.cartItem.findMany({ where: { userId: TEMP_USER_ID } });
  res.json(items);
};

const addItems = async (req, res) => {
  const { recipeId, recipeTitle, ingredients } = req.body;
  if (!recipeId || !ingredients?.length) {
    return res.status(400).json({ error: 'recipeId and ingredients are required' });
  }
  const existing = await prisma.cartItem.findFirst({ where: { recipeId, userId: TEMP_USER_ID } });
  if (existing) {
    const merged = [...new Set([...existing.ingredients, ...ingredients])];
    const updated = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { ingredients: merged },
    });
    return res.json(updated);
  }
  const item = await prisma.cartItem.create({
    data: { recipeId, recipeTitle, ingredients, userId: TEMP_USER_ID },
  });
  res.status(201).json(item);
};

const updateItem = async (req, res) => {
  const id = Number(req.params.id);
  const { ingredients } = req.body;
  if (!ingredients?.length) {
    await prisma.cartItem.delete({ where: { id } });
    return res.json({ deleted: true });
  }
  const updated = await prisma.cartItem.update({ where: { id }, data: { ingredients } });
  res.json(updated);
};

const removeItem = async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.cartItem.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Cart item not found' });
  await prisma.cartItem.delete({ where: { id } });
  res.json({ success: true });
};

const clearCart = async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: TEMP_USER_ID } });
  res.json({ success: true });
};

module.exports = { getCart, addItems, updateItem, removeItem, clearCart };
