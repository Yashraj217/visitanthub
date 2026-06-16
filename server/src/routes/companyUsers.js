const router = require('express').Router();
const ctrl = require('../controllers/companyUserController');
const visitCtrl = require('../controllers/visitController');
const { authenticate, requireRole } = require('../middleware/auth');

// Company user's own data — MUST come before /:id
router.get('/my/services', authenticate, requireRole('company_user'), ctrl.myServices);
router.get('/my/visits',   authenticate, requireRole('company_user'), visitCtrl.list);

// Company admin manages users
router.get('/',       authenticate, requireRole('company_admin'), ctrl.list);
router.post('/',      authenticate, requireRole('company_admin'), ctrl.create);
router.put('/:id',    authenticate, requireRole('company_admin'), ctrl.update);
router.delete('/:id', authenticate, requireRole('company_admin'), ctrl.remove);

module.exports = router;
