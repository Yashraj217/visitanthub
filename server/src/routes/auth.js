const router = require('express').Router();
const { login, register, verifyEmail, getMe, changePassword, forgotPassword, resetPassword, impersonate, savePushToken } = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const SSO_SECRET  = '1d6529940500f4fa38a9b694d6ebc8f6f872a42a198f2dc0914ad162609b47e1';
const COMPANY_ID  = 'cmpgcdhgw0001wksz4yw3o15a';
const SSO_URL     = 'https://issuely.in/api/auth/sso';
const PROJECT_ID  = 'cmqkicgdj0000dk53dguogjwq';

router.post('/login',           login);
router.post('/register',        register);
router.get('/verify-email',     verifyEmail);
router.get('/me',               authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);
router.post('/impersonate',     authenticate, requireRole('super_admin'), impersonate);
router.post('/push-token',      authenticate, savePushToken);

router.get('/sso-link', authenticate, (req, res) => {
  const { email, name } = req.user;
  const token = jwt.sign(
    { companyId: COMPANY_ID, email, name, role: 'CUSTOMER', projectId: PROJECT_ID },
    SSO_SECRET,
    { algorithm: 'HS256', expiresIn: '5m' }
  );
  res.json({ url: `${SSO_URL}?token=${token}&redirect=${encodeURIComponent('/dashboard')}` });
});

module.exports = router;
