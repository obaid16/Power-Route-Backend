const mongoose = require('mongoose');

const CATEGORIES = ['hospital', 'police', 'hotel', 'repair', 'food'];

const nearbyServiceSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
      index: true
    },
    name: { type: String, required: true },
    distance: { type: String, required: true },
    phone: { type: String, default: null },
    address: { type: String, required: true },
    open: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('NearbyService', nearbyServiceSchema);
module.exports.CATEGORIES = CATEGORIES;
