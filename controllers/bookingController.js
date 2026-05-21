const catchAsync = require('../utils/catchAsync');
const bookingService = require('../services/bookingService');

const create = catchAsync(async (req, res) => {
  const { chargingStationId, bookingTime, chargingDurationMinutes } = req.body;
  const booking = await bookingService.createBooking(
    req.user._id,
    chargingStationId,
    bookingTime,
    chargingDurationMinutes
  );
  res.status(201).json({ status: 'success', data: { booking } });
});

const cancel = catchAsync(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.user._id, req.params.id);
  res.status(200).json({ status: 'success', data: { booking } });
});

const history = catchAsync(async (req, res) => {
  const bookings = await bookingService.listHistory(req.user._id);
  res.status(200).json({ status: 'success', results: bookings.length, data: { bookings } });
});

module.exports = { create, cancel, history };
