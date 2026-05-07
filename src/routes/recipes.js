const express = require('express');
const router = express.Router();
const recipesController = require('../controllers/recipes');

router.get('/', recipesController.getAll);
router.post('/', recipesController.create);
router.put('/:id', recipesController.update);
router.delete('/:id', recipesController.remove);

module.exports = router;
