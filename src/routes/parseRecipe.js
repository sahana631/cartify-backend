const express = require('express');
const router = express.Router();
const { parseRecipe } = require('../controllers/parseRecipe');

router.post('/', parseRecipe);

module.exports = router;
