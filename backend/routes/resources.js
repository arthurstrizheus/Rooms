const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');

// GET all resources
router.get('/', resourceController.GetAll);
router.post('/', resourceController.Post);
router.put('/:id', resourceController.Update);
router.delete('/:id', resourceController.Delete);

module.exports = router;
