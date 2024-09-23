const express = require('express');
const router = express.Router();
const specialPermissionsController = require('../controllers/specialPermissionsController');

router.get('/', specialPermissionsController.GetAll);
router.get('/:userId', specialPermissionsController.GetAllForUser);
router.get('/meeting/:meetingId', specialPermissionsController.GetAllForMeeting);
router.post('/', specialPermissionsController.Post);
router.put('/:id', specialPermissionsController.Update);
router.delete('/:id', specialPermissionsController.Delete);

module.exports = router;