const express = require('express');

const { protect } = require('../middlewares/authMiddleware');
const { createPurchase, getPurchases, cancelPurchase, recordPaymentForPurchase, getPurchaseById } = require('../controllers/purchaseController');

const router = express.Router();

router.post(
    "/",
    protect,
    createPurchase
)

router.get(
    "/",
    protect,
    getPurchases
)
router.get('/:id',protect,getPurchaseById)
router.put('/:id/cancel', protect,cancelPurchase); 
router.put('/:id/payment', protect,recordPaymentForPurchase);


module.exports = router;