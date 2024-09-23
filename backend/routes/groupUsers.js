const express = require('express');
const router = express.Router();
const groupUsersController = require('../controllers/groupUserController');

router.get('/', groupUsersController.GetAll);
router.post('/', groupUsersController.Post);
router.put('/:id', groupUsersController.Update);
router.delete('/:id', groupUsersController.Delete);+
router.delete('/', groupUsersController.DeleteByGroupId);

module.exports = router;