const prisma = require('../lib/prisma');

const getPantry = async (req, res) => {
  const items = await prisma.pantryItem.findMany({
    where: { userId: req.session.userId },
    orderBy: { name: 'asc' },
  });
  res.json(items);
};

const addPantryItem = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const item = await prisma.pantryItem.upsert({
    where: { userId_name: { userId: req.session.userId, name: name.trim().toLowerCase() } },
    update: {},
    create: { name: name.trim().toLowerCase(), userId: req.session.userId },
  });
  res.json(item);
};

const removePantryItem = async (req, res) => {
  const { id } = req.params;
  const item = await prisma.pantryItem.findUnique({ where: { id: Number(id) } });
  if (!item || item.userId !== req.session.userId)
    return res.status(404).json({ error: 'Not found' });

  await prisma.pantryItem.delete({ where: { id: Number(id) } });
  res.json({ success: true });
};

module.exports = { getPantry, addPantryItem, removePantryItem };
