const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getNearbyServices } = require('../controllers/serviceController');

const router = express.Router();

// All service routes require user authentication
router.use(protect);

router.get('/nearby', getNearbyServices);

module.exports = router;
