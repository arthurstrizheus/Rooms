const express = require('express');
const router = express.Router();
const officeController = require('../controllers/officeController');

router.get('/', officeController.GetAll);

module.exports = router;
