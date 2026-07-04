const router = require('express').Router();
const ctrl   = require('../controllers/visitController');
const photos = require('../controllers/photoController');
const stages = require('../controllers/stageController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/',                    ctrl.list);
router.get('/my-charts',           requireRole('company_user'), ctrl.myCharts);
router.get('/employees',           requireRole('company_admin', 'company_user'), ctrl.listEligibleEmployees);
router.get('/:id',                 ctrl.getOne);
router.put('/:id/status',          requireRole('company_admin', 'company_user'), ctrl.updateStatus);
router.put('/:id/employee',        requireRole('company_admin', 'company_user'), ctrl.updateEmployee);
router.put('/:id/field-values',    requireRole('company_user', 'company_admin'), ctrl.updateFieldValues);
router.put('/:id/stage',           requireRole('company_admin', 'company_user'), stages.advanceStage);
router.put('/:id/stage-waiting',   requireRole('company_admin', 'company_user'), stages.setStageWaiting);
router.get('/:id/stage-logs',      requireRole('company_admin', 'company_user'), stages.getStageLogs);

// Photos
router.get('/:id/photos',          requireRole('company_admin', 'company_user'), photos.listPhotos);
router.post('/:id/photos',         requireRole('company_admin', 'company_user'), photos.uploadPhotos);
router.delete('/:id/photos/:pid',  requireRole('company_admin', 'company_user'), photos.deletePhoto);

module.exports = router;
