const express = require('express');
const router = express.Router();
const { planMeals } = require('../controllers/planMeals');

router.post('/', planMeals);

module.exports = router;
