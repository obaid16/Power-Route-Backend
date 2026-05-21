const catchAsync = require('../utils/catchAsync');
const NearbyService = require('../models/NearbyService');

/**
 * Get all nearby essential services (hospitals, hotels, police, food, repair)
 */
const getNearbyServices = catchAsync(async (req, res) => {
  // Query all services from the database
  const services = await NearbyService.find();

  res.status(200).json({
    status: 'success',
    results: services.length,
    data: {
      services
    }
  });
});

module.exports = {
  getNearbyServices
};
