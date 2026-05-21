const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const bookingController = require('../controllers/bookingController');
const { validateRequest } = require('../middleware/validateMiddleware');
const { createBookingRules, cancelBookingRules } = require('../validators/bookingValidator');

const router = express.Router();

router.use(protect);

router.post('/create', createBookingRules, validateRequest, bookingController.create);
router.get('/history', bookingController.history);
router.delete('/:id', cancelBookingRules, validateRequest, bookingController.cancel);

module.exports = router;
