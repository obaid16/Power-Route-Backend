/**
 * reviewController.js — Station reviews with safety tags
 */
const Review = require('../models/Review');
const ChargingStation = require('../models/ChargingStation');
const Booking = require('../models/Booking');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

const createReview = catchAsync(async (req, res) => {
  const { stationId, bookingId, rating, title, body, safetyTags, safetyRating, chargerCondition, cleanliness, waitTime } = req.body;

  const existing = await Review.findOne({ user: req.user._id, station: stationId });
  if (existing) throw new AppError('You have already reviewed this station', 409);

  let isVerifiedVisit = false;
  if (bookingId) {
    const booking = await Booking.findOne({ _id: bookingId, user: req.user._id, station: stationId, status: 'completed' });
    if (booking) isVerifiedVisit = true;
  }

  const review = await Review.create({
    user: req.user._id, station: stationId, booking: bookingId,
    rating, title, body, safetyTags, safetyRating, chargerCondition, cleanliness, waitTime,
    isVerifiedVisit,
  });

  // Update station average rating
  const stats = await Review.aggregate([
    { $match: { station: review.station, isHidden: false } },
    { $group: { _id: '$station', avgRating: { $avg: '$rating' }, count: { $sum: 1 }, avgSafety: { $avg: '$safetyRating' } } },
  ]);

  if (stats.length > 0) {
    await ChargingStation.findByIdAndUpdate(stationId, {
      'ratings.average': Math.round(stats[0].avgRating * 10) / 10,
      'ratings.count': stats[0].count,
      safetyRating: Math.round((stats[0].avgSafety || 0) * 10) / 10,
    });
  }

  await review.populate('user', 'name avatar');
  sendSuccess(res, 201, 'Review submitted successfully.', { review });
});

const getStationReviews = catchAsync(async (req, res) => {
  const { stationId } = req.params;
  const { page = 1, limit = 10, safetyTag } = req.query;

  const query = { station: stationId, isHidden: false };
  if (safetyTag) query.safetyTags = safetyTag;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reviews, total] = await Promise.all([
    Review.find(query).populate('user', 'name avatar').sort({ isVerifiedVisit: -1, createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Review.countDocuments(query),
  ]);

  sendPaginated(res, 200, 'Reviews fetched.', reviews, { page: parseInt(page), limit: parseInt(limit), total });
});

const deleteReview = catchAsync(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.reviewId, user: req.user._id });
  if (!review) throw new AppError('Review not found', 404);
  sendSuccess(res, 200, 'Review deleted.');
});

module.exports = { createReview, getStationReviews, deleteReview };
