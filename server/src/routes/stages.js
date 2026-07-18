const router = require('express').Router();
const { getStages, getAllStages, saveStages, getStageAnalytics, getStagesEnabled, setStagesEnabled, getWaitingStatusEnabled, setWaitingStatusEnabled, getDisplayBoardEnabled, setDisplayBoardEnabled } = require('../controllers/stageController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/analytics',       requireRole('company_admin'), getStageAnalytics);
router.get('/enabled',         requireRole('company_admin'), getStagesEnabled);
router.put('/enabled',         requireRole('company_admin'), setStagesEnabled);
router.get('/waiting-status',  requireRole('company_admin'), getWaitingStatusEnabled);
router.put('/waiting-status',  requireRole('company_admin'), setWaitingStatusEnabled);
router.get('/display-board',   requireRole('company_admin'), getDisplayBoardEnabled);
router.put('/display-board',   requireRole('company_admin'), setDisplayBoardEnabled);
router.get('/all',             requireRole('company_admin'), getAllStages);
router.get('/',                getStages);
router.put('/',                requireRole('company_admin'), saveStages);

module.exports = router;
