const express = require('express');
const router = express.Router();
const editController = require('../controllers/editController');

router.get('/edit-tables', editController.getCategories);
router.get('/artists-stat', editController.getArtists);
router.get('/edit-orders', editController.getOrders);
router.get('/edit-orders/edit/:id', editController.getEditOrders);
router.put('/edit-orders/edit/:purchase_id', editController.putEditOrders);
router.delete('/edit-orders/edit/:purchase_id/delete/:item_id', editController.editOrdersDeleteItem);
router.delete('/edit-orders/delete/:purchase_id', editController.editOrdersDelete);
router.delete('/edit-tables/delete/:id', editController.editTablesDelete);
router.post('/edit-tables/add-category', editController.editTablesAdd);
router.put('/edit-tables/update-cetegory/:id', editController.editTablesUpdate)
router.get('/artists-stat/print/:artist_id', editController.getArtistStat);




module.exports = router;
