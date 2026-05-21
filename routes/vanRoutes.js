const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getNearbyVans, requestVan, cancelVan } = require('../controllers/vanController');

const router = express.Router();

// All van routes require user authentication
router.use(protect);

router.get('/nearby', getNearbyVans);
router.post('/request', requestVan);
router.post('/cancel', cancelVan);

module.exports = router;
