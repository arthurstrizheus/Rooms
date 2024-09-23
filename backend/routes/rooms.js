const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.get('/', roomController.GetAll);
router.post('/', roomController.Post);
router.put('/:id', roomController.Update);
router.delete('/:id', roomController.Delete);

module.exports = router;