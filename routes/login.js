const express = require('express');
const router = express.Router();
const loginController = require('../controllers/authController');  

router.get('/login', loginController.getLoginPage);  
router.post('/login', loginController.postLogin);  
router.get('/register', loginController.getRegisterPage);
router.post('/register', loginController.postRegister);

module.exports = router;