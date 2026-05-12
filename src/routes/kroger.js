const express = require('express');
const router = express.Router();
const { connectKroger, loginWithKroger, krogerCallback, getLocations, searchIngredients, sendToKroger } = require('../controllers/kroger');
const requireAuth = require('../middleware/requireAuth');

router.get('/connect', requireAuth, connectKroger);
router.get('/callback', krogerCallback);
router.get('/locations', requireAuth, getLocations);
router.post('/search', requireAuth, searchIngredients);
router.post('/send-cart', requireAuth, sendToKroger);

module.exports = router;
