const prisma = require('../lib/prisma');

const getPlanner = async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end dates required' });

  const plans = await prisma.mealPlan.findMany({
    where: {
      userId: req.session.userId,
      date: { gte: start, lte: end },
    },
    include: { recipe: { select: { id: true, title: true, time: true } } },
  });

  res.json(plans);
};

const addMealPlan = async (req, res) => {
  const { date, mealType, recipeId } = req.body;
  if (!date || !mealType || !recipeId)
    return res.status(400).json({ error: 'date, mealType, and recipeId are required' });

  const plan = await prisma.mealPlan.upsert({
    where: { userId_date_mealType: { userId: req.session.userId, date, mealType } },
    update: { recipeId },
    create: { date, mealType, recipeId, userId: req.session.userId },
    include: { recipe: { select: { id: true, title: true, time: true } } },
  });

  res.json(plan);
};

const removeMealPlan = async (req, res) => {
  const { id } = req.params;
  const plan = await prisma.mealPlan.findUnique({ where: { id: Number(id) } });
  if (!plan || plan.userId !== req.session.userId)
    return res.status(404).json({ error: 'Not found' });

  await prisma.mealPlan.delete({ where: { id: Number(id) } });
  res.json({ success: true });
};

module.exports = { getPlanner, addMealPlan, removeMealPlan };
