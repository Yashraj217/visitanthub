const router = require('express').Router();
const ctrl   = require('../controllers/visitController');
const photos = require('../controllers/photoController');
const stages = require('../controllers/stageController');
const { authenticate, requireRole } = require('../middleware/auth');
const { subscribe } = require('../services/displayBroadcaster');

// SSE endpoint — token passed as ?token= because EventSource can't send headers
router.get('/events', authenticate, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(':connected\n\n');
  const unsubscribe = subscribe(req.user.company_id, res);
  const hb = setInterval(() => { try { res.write(':ping\n\n'); } catch (_) { clearInterval(hb); unsubscribe(); } }, 25000);
  req.on('close', () => { clearInterval(hb); unsubscribe(); });
});

router.use(authenticate);

router.get('/',                    ctrl.list);
router.get('/my-charts',           requireRole('company_user'), ctrl.myCharts);
router.get('/employees',           requireRole('company_admin', 'company_user'), ctrl.listEligibleEmployees);
router.get('/revisits/count',       requireRole('company_admin', 'company_user'), ctrl.getRevisitsCount);
router.get('/revisits',            requireRole('company_admin', 'company_user'), ctrl.getRevisits);
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

// Notes
router.get('/:id/notes',           requireRole('company_admin', 'company_user'), ctrl.getNotes);
router.post('/:id/notes',          requireRole('company_admin', 'company_user'), ctrl.addNote);

// Next visit
router.put('/:id/next-visit',      requireRole('company_admin', 'company_user'), ctrl.updateNextVisit);

module.exports = router;
