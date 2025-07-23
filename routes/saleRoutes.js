const express = require('express');
const {
    createSale,
    getSales,
    recordPaymentForSale,
    getSaleById,
    cancelSale,
    getTransactions
} = require('../controllers/saleController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post(
    "/",
    protect,
    createSale
)

router.get(
    "/",
    protect,
    getSales
)
router.get('/:id',protect,getSaleById)
router.put('/:id/cancel', protect,cancelSale); 
router.put('/:id/payment', protect,recordPaymentForSale);


module.exports = router;