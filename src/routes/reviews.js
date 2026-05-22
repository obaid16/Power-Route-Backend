const express = require('express');
const { createReview, getStationReviews, deleteReview } = require('../controllers/reviewController');
const { protect, optionalAuth } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/station/:stationId', [param('stationId').isMongoId()], validate, optionalAuth, getStationReviews);
router.post('/', protect, [
  body('stationId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
], validate, createReview);
router.delete('/:reviewId', protect, [param('reviewId').isMongoId()], validate, deleteReview);

module.exports = router;
