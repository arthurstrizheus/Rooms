const express = require('express');
const router = express.Router();
const ZScalerController = require('../controllers/ZScalerController');

router.post('/', ZScalerController.PostBlockReqestSite);

module.exports = router;
