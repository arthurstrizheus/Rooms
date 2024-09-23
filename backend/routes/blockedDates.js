const express = require('express');
const router = express.Router();
const blockedDateController = require('../controllers/blockedDateController');

router.get('/', blockedDateController.GetAll);
router.post('/', blockedDateController.Post);
router.put('/:id', blockedDateController.Update);
router.delete('/:id', blockedDateController.Delete);

module.exports = router;
