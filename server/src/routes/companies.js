const router = require('express').Router();
const ctrl = require('../controllers/companyController');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');

// Company admin routes — must come BEFORE /:id to avoid route collision
router.get('/me/profile',                    authenticate, requireRole('company_admin'), ctrl.getProfile);
router.put('/me/profile',                    authenticate, requireRole('company_admin'), ctrl.updateProfile);
router.put('/me/settings',                   authenticate, requireRole('company_admin'), ctrl.updateSettings);
router.get('/me/stats',                      authenticate, requireRole('company_admin'), ctrl.getStats);
router.get('/me/charts',                     authenticate, requireRole('company_admin'), ctrl.getCharts);
router.put('/me/ref-settings',               authenticate, requireRole('company_admin'), ctrl.updateRefSettings);
router.post('/me/ref-reset',                 authenticate, requireRole('company_admin'), ctrl.resetRefCounter);
router.put('/me/services/:serviceId/ref',    authenticate, requireRole('company_admin'), ctrl.updateServiceRefPrefix);
router.post('/me/logo',                      authenticate, requireRole('company_admin'), uploadLogo, ctrl.uploadCompanyLogo);
router.post('/me/services/:serviceId/logo',  authenticate, requireRole('company_admin'), uploadLogo, ctrl.uploadServiceLogo);

// Super admin routes
router.get('/',           authenticate, requireRole('super_admin'), ctrl.listCompanies);
router.get('/:id',        authenticate, requireRole('super_admin'), ctrl.getCompany);
router.put('/:id/status', authenticate, requireRole('super_admin'), ctrl.updateStatus);
router.delete('/:id',     authenticate, requireRole('super_admin'), ctrl.deleteCompany);

module.exports = router;
