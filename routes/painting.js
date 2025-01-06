const express = require('express');
const router = express.Router();
const paintingController = require('../controllers/paintingController');

router.get('/profile/add-painting', paintingController.getAddPainting);
router.post('/profile/add-painting', paintingController.postAddPainting);
router.delete('/profile/delete/:painting_id', paintingController.deletePainting);
router.get('/profile/edit/:painting_id', paintingController.editPainting);
router.put('/profile/edit/:painting_id', paintingController.putEditPainting);

module.exports = router;
