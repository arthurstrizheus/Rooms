const express = require('express');
const router = express.Router();
const roomResourceController = require('../controllers/roomResourceController');

router.get('/', roomResourceController.GetAll);
router.get('/:roomId', roomResourceController.GetAllForRoom);
router.post('/', roomResourceController.Post);
router.put('/:id', roomResourceController.Update);
router.delete('/:id', roomResourceController.Delete);

module.exports = router;