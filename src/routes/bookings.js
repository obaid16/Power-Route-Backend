const express = require('express');
const { createBooking, confirmBooking, cancelBooking, getMyBookings, getBooking, completeBooking } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', getMyBookings);
router.get('/:bookingId', [param('bookingId').isMongoId()], validate, getBooking);
router.post('/', [
  body('stationId').isMongoId().withMessage('Valid stationId required'),
  body('chargerId').isMongoId().withMessage('Valid chargerId required'),
  body('scheduledAt').isISO8601().withMessage('Valid scheduledAt date required'),
  body('durationMinutes').isInt({ min: 15, max: 480 }).withMessage('Duration must be 15–480 minutes'),
], validate, createBooking);
router.patch('/:bookingId/confirm', [param('bookingId').isMongoId()], validate, confirmBooking);
router.patch('/:bookingId/cancel', [param('bookingId').isMongoId()], validate, cancelBooking);
router.patch('/:bookingId/complete', protect, authorize('admin', 'stationOwner'), [param('bookingId').isMongoId()], validate, completeBooking);

module.exports = router;
