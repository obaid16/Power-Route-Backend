const { body, query } = require('express-validator');

/** POST /women-safety/activate */
const activateShieldRules = [
  body('lat').isFloat({ min: -90,  max: 90  }).withMessage('lat must be a valid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('lng must be a valid longitude'),
  body('guardianContacts')
    .optional()
    .isArray({ max: 5 })
    .withMessage('guardianContacts must be an array of up to 5 entries'),
  body('guardianContacts.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }),
  body('guardianContacts.*.phone')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 }),
];

/** POST /women-safety/deactivate */
const deactivateShieldRules = [
  body('lat').optional().isFloat({ min: -90,  max: 90  }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
];

/** POST /women-safety/share-location */
const shareLocationRules = [
  body('lat').isFloat({ min: -90,  max: 90  }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('message').optional().trim().isLength({ max: 300 }),
];

/** GET /women-safety/safe-stations */
const safeStationsRules = [
  query('lat').isFloat({ min: -90,  max: 90  }),
  query('lng').isFloat({ min: -180, max: 180 }),
  query('radiusKm')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('radiusKm must be between 1 and 100'),
  query('womenSafe')
    .optional()
    .isIn(['true', 'false']),
  query('open247')
    .optional()
    .isIn(['true', 'false']),
  query('cctv')
    .optional()
    .isIn(['true', 'false']),
  query('maxWaitMin')
    .optional()
    .isInt({ min: 0, max: 120 }),
];

/** POST /women-safety/sos */
const womenSosRules = [
  body('lat').isFloat({ min: -90,  max: 90  }),
  body('lng').isFloat({ min: -180, max: 180 }),
  body('message').optional().trim().isLength({ max: 500 }),
];

/** POST /women-safety/community-review */
const communityReviewRules = [
  body('stationId')
    .isMongoId()
    .withMessage('stationId must be a valid MongoDB ObjectId'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('rating must be 1–5'),
  body('text')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Review text must be 5–1000 characters'),
  body('safeAlone')
    .isBoolean()
    .withMessage('safeAlone must be true or false'),
];

module.exports = {
  activateShieldRules,
  deactivateShieldRules,
  shareLocationRules,
  safeStationsRules,
  womenSosRules,
  communityReviewRules,
};
