const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');  
const { route } = require('./gallery');

router.get('/profile', profileController.getProfile);  
router.put('/update-profile', profileController.updateProfile);
router.delete('/delete-profile', profileController.deleteProfile);

module.exports = router;