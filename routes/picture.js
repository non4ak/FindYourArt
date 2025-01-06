const express = require('express');
const router = express.Router();
const pictureController = require('../controllers/pictureController');  

router.get('/picture/:id', pictureController.getPicture);  

module.exports = router;