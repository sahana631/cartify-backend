const express = require('express');
const router = express.Router();
const { getPlanner, addMealPlan, removeMealPlan } = require('../controllers/planner');

router.get('/', getPlanner);
router.post('/', addMealPlan);
router.delete('/:id', removeMealPlan);

module.exports = router;
