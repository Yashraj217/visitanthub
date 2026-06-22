const router = require('express').Router();
const ctrl   = require('../controllers/schedulingController');
const { authenticate, requireRole } = require('../middleware/auth');

// ── Public routes (no auth) ──────────────────────────────────────────────────
router.get('/public/:slug/info',             ctrl.getBookingInfo);
router.get('/public/:slug/slots',            ctrl.getAvailableSlots);
router.post('/public/:slug/book',            ctrl.createBooking);
router.get('/public/booking/:ref',           ctrl.getBookingStatus);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get('/bookings',      authenticate, requireRole('company_admin', 'company_user'), ctrl.listBookings);
router.put('/bookings/:id',  authenticate, requireRole('company_admin', 'company_user'), ctrl.updateBookingStatus);
router.get('/availability',  authenticate, requireRole('company_admin'),                 ctrl.getAvailability);
router.put('/availability',  authenticate, requireRole('company_admin'),                 ctrl.saveAvailability);

module.exports = router;
