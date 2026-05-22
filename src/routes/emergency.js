const express = require('express');
const { triggerSOS, resolveSOS, getMySOS, getContacts, addContact, updateContact, deleteContact, getActiveSOS } = require('../controllers/emergencyController');
const { protect, authorize } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

// SOS Alerts
router.post('/sos', [
  body('coordinates').isArray({ min: 2, max: 2 }).withMessage('coordinates [lng, lat] required'),
  body('type').optional().isIn(['breakdown', 'accident', 'medical', 'security', 'low_battery', 'other']),
], validate, triggerSOS);
router.patch('/sos/:sosId/resolve', [param('sosId').isMongoId()], validate, resolveSOS);
router.get('/sos', getMySOS);
router.get('/sos/active', authorize('admin'), getActiveSOS);

// Emergency Contacts
router.get('/contacts', getContacts);
router.post('/contacts', [
  body('name').notEmpty().withMessage('Name required'),
  body('phone').notEmpty().withMessage('Phone required'),
], validate, addContact);
router.patch('/contacts/:contactId', [param('contactId').isMongoId()], validate, updateContact);
router.delete('/contacts/:contactId', [param('contactId').isMongoId()], validate, deleteContact);

module.exports = router;
