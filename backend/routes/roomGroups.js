const express = require('express');
const router = express.Router();
const roomGroupController = require('../controllers/roomGroupController');

router.get('/', roomGroupController.GetAll);
router.post('/', roomGroupController.Post);
router.put('/:id', roomGroupController.Update);
router.delete('/:id', roomGroupController.Delete);
router.delete('/', roomGroupController.DeleteRoomId);

module.exports = router;