const prisma = require('../lib/prisma');

// Temporary hardcoded userId — will come from auth session once login is set up
const TEMP_USER_ID = 1;

const getAll = async (req, res) => {
  const recipes = await prisma.recipe.findMany({ where: { userId: TEMP_USER_ID } });
  res.json(recipes);
};

const create = async (req, res) => {
  const { title, description, time, servings, ingredients } = req.body;
  if (!title || !ingredients?.length) {
    return res.status(400).json({ error: 'title and ingredients are required' });
  }
  const recipe = await prisma.recipe.create({
    data: { title, description, time, servings: Number(servings), ingredients, userId: TEMP_USER_ID },
  });
  res.status(201).json(recipe);
};

const update = async (req, res) => {
  const id = Number(req.params.id);
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  const updated = await prisma.recipe.update({ where: { id }, data: req.body });
  res.json(updated);
};

const remove = async (req, res) => {
  const id = Number(req.params.id);
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  await prisma.recipe.delete({ where: { id } });
  res.json({ success: true });
};

module.exports = { getAll, create, update, remove };
