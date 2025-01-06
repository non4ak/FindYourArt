const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { appendXML } = require('pdfkit');

router.get('/cart', cartController.getCart);
router.post('/add-to-cart/:paintingId', cartController.addToCart);
router.post('/cart/remove/:painting_id', cartController.removeFromCart);
router.get('/cart/purchase', cartController.getPurchase);
router.post('/cart/purchase', cartController.postPurchase);
router.get('/cart/purchase/confirmation/:purchaseId', cartController.getPurchaseConfirm);
router.get('/cart/purchase/download/:orderId', cartController.purchaseDownload);


module.exports = router;
