const express = require('express');
const cors = require('cors');

const recipeRoutes = require('./routes/recipes');
const cartRoutes = require('./routes/cart');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/recipes', recipeRoutes);
app.use('/api/cart', cartRoutes);

module.exports = app;
