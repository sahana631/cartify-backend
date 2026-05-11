const express = require('express');
const router = express.Router();
const { getPantry, addPantryItem, removePantryItem } = require('../controllers/pantry');

router.get('/', getPantry);
router.post('/', addPantryItem);
router.delete('/:id', removePantryItem);

module.exports = router;
