const express = require('express');
const { initiateSubscriptionPayment, verifySubscriptionPayment} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();


router.post('/initiate-subscription', protect,initiateSubscriptionPayment);
router.post('/verify-subscription', protect,verifySubscriptionPayment);

module.exports = router;