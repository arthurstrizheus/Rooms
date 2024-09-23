const express = require('express');
const router = express.Router();
const meetingGroupController = require('../controllers/meetingGroupController');

router.get('/', meetingGroupController.GetAll);
router.post('/', meetingGroupController.Post);
router.put('/:id', meetingGroupController.Update);
router.delete('/:id', meetingGroupController.Delete);

module.exports = router;