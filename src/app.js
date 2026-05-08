const express = require('express');
const cors = require('cors');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const cartRoutes = require('./routes/cart');
const krogerRoutes = require('./routes/kroger');
const plannerRoutes = require('./routes/planner');
const parseRecipeRoutes = require('./routes/parseRecipe');
const requireAuth = require('./middleware/requireAuth');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'cartify-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/api/recipes', requireAuth, recipeRoutes);
app.use('/api/cart', requireAuth, cartRoutes);
app.use('/auth/kroger', krogerRoutes);
app.use('/api/planner', requireAuth, plannerRoutes);
app.use('/api/parse-recipe', requireAuth, parseRecipeRoutes);

module.exports = app;
