const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart');

router.get('/', cartController.getCart);
router.post('/items', cartController.addItems);
router.patch('/items/:id', cartController.updateItem);
router.delete('/items/:id', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
