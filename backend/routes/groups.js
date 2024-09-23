const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

router.get('/', groupController.GetAll);
router.get('/user/:id', groupController.GetUsersGroups);
router.post('/', groupController.Post);
router.put('/:id', groupController.Update);
router.delete('/:id', groupController.Delete);

module.exports = router;
