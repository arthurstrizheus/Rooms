const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingControler');

router.get('/', meetingController.GetAll);
router.get('/created/:id', meetingController.GetAllUserCreated);
router.post('/canbook/:userId', meetingController.CanBook);
router.get('/user/:id', meetingController.GetAllUserCanSee);
router.get('/needsapproved/:id', meetingController.GetAllNeedsApproval);
router.post('/', meetingController.Post);
router.put('/:id', meetingController.Update);
router.put('/updatenext/:userId', meetingController.UpdateAllNextInRecurrence);
router.put('/updateall/:userId', meetingController.UpdateAllRecurrence);
router.delete('/cancelnext', meetingController.CancelNext);
router.delete('/cancelall', meetingController.CancelAll);
router.put('/status/:id', meetingController.SetStatus);
router.delete('/', meetingController.Delete);
router.put('/parentonly/:id', meetingController.UpdateOnlyParentRecurrence);

module.exports = router;