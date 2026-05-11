const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const cartRoutes = require('./routes/cart');
const krogerRoutes = require('./routes/kroger');
const plannerRoutes = require('./routes/planner');
const parseRecipeRoutes = require('./routes/parseRecipe');
const pantryRoutes = require('./routes/pantry');
const planMealsRoutes = require('./routes/planMeals');
const requireAuth = require('./middleware/requireAuth');

const app = express();

const isProd = process.env.NODE_ENV === 'production';

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({
  store: isProd ? new pgSession({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }),
    createTableIfMissing: true,
  }) : undefined,
  secret: process.env.SESSION_SECRET || 'cartable-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/api/recipes', requireAuth, recipeRoutes);
app.use('/api/cart', requireAuth, cartRoutes);
app.use('/auth/kroger', krogerRoutes);
app.use('/api/planner', requireAuth, plannerRoutes);
app.use('/api/parse-recipe', requireAuth, parseRecipeRoutes);
app.use('/api/pantry', requireAuth, pantryRoutes);
app.use('/api/plan-meals', requireAuth, planMealsRoutes);

module.exports = app;
