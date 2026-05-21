const catchAsync = require('../utils/catchAsync');
const ChargingVan = require('../models/ChargingVan');

/**
 * Get all available mobile charging vans
 */
const getNearbyVans = catchAsync(async (req, res) => {
  // Return all vans. We can optionally query based on coordinates or availability.
  // To keep it robust, we'll return all vans, sorted by distance.
  const vans = await ChargingVan.find().sort({ distanceKm: 1 });
  
  // Find if there is currently an active request for the logged-in user
  const activeVan = await ChargingVan.findOne({ activeRequestId: req.user._id });

  res.status(200).json({
    status: 'success',
    results: vans.length,
    data: {
      vans,
      activeRequest: activeVan
    }
  });
});

/**
 * Simulate dispatching a mobile charging van to the logged-in user
 */
const requestVan = catchAsync(async (req, res) => {
  const { vanId } = req.body;
  if (!vanId) {
    return res.status(400).json({ status: 'fail', message: 'Please provide a vanId' });
  }

  // Check if user already has an active request
  const existingActive = await ChargingVan.findOne({ activeRequestId: req.user._id });
  if (existingActive) {
    return res.status(400).json({
      status: 'fail',
      message: 'You already have an active van dispatch. Cancel it first before requesting another.'
    });
  }

  // Find the requested van
  const van = await ChargingVan.findById(vanId);
  if (!van) {
    return res.status(404).json({ status: 'fail', message: 'Charging van not found' });
  }

  // Dispatch the van to the user
  van.available = false;
  van.activeRequestId = req.user._id;
  await van.save();

  res.status(200).json({
    status: 'success',
    message: 'Mobile charging van successfully dispatched!',
    data: { van }
  });
});

/**
 * Cancel the current active van dispatch for the logged-in user
 */
const cancelVan = catchAsync(async (req, res) => {
  const { vanId } = req.body;
  if (!vanId) {
    return res.status(400).json({ status: 'fail', message: 'Please provide a vanId' });
  }

  const van = await ChargingVan.findById(vanId);
  if (!van) {
    return res.status(404).json({ status: 'fail', message: 'Charging van not found' });
  }

  // Reset availability and request
  van.available = true;
  van.activeRequestId = null;
  await van.save();

  res.status(200).json({
    status: 'success',
    message: 'Mobile charging van request successfully cancelled.',
    data: { van }
  });
});

module.exports = {
  getNearbyVans,
  requestVan,
  cancelVan
};
