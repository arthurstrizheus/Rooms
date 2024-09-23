const express = require('express');
const router = express.Router();
const typeController = require('../controllers/typeController');

router.get('/', typeController.GetAll);
router.post('/', typeController.Post);
router.put('/:id', typeController.Update);
router.delete('/:id', typeController.Delete);

module.exports = router;