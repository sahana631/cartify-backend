const prisma = require('../lib/prisma');

const getAll = async (req, res) => {
  const recipes = await prisma.recipe.findMany({ where: { userId: req.session.userId } });
  res.json(recipes);
};

const create = async (req, res) => {
  const { title, description, time, servings, ingredients, instructions, tags } = req.body;
  if (!title || !ingredients?.length)
    return res.status(400).json({ error: 'title and ingredients are required' });
  const recipe = await prisma.recipe.create({
    data: {
      title, description, time,
      servings: Number(servings),
      ingredients,
      instructions: instructions || null,
      tags: tags || [],
      userId: req.session.userId,
    },
  });
  res.status(201).json(recipe);
};

const update = async (req, res) => {
  const id = Number(req.params.id);
  const recipe = await prisma.recipe.findFirst({ where: { id, userId: req.session.userId } });
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  const updated = await prisma.recipe.update({ where: { id }, data: req.body });
  res.json(updated);
};

const remove = async (req, res) => {
  const id = Number(req.params.id);
  const recipe = await prisma.recipe.findFirst({ where: { id, userId: req.session.userId } });
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  await prisma.recipe.delete({ where: { id } });
  res.json({ success: true });
};

module.exports = { getAll, create, update, remove };
