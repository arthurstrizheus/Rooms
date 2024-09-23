const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.GetAll);
router.post('/', userController.Post);
router.put('/:id', userController.Update);
router.put('/details/:id', userController.UpdateDetails);
router.put('/password/:id', userController.UpdatePassword);
router.delete('/:id', userController.Delete);
router.post('/login', userController.Authenticate);
router.put('/activate/:id', userController.Activate);
router.put('/deactivate/:id', userController.Deactivate);

module.exports = router;