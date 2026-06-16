const router = require('express').Router();
const { login, register, getMe, changePassword, forgotPassword, resetPassword, impersonate } = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/login',           login);
router.post('/register',        register);
router.get('/me',               authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);
router.post('/impersonate',     authenticate, requireRole('super_admin'), impersonate);

module.exports = router;
