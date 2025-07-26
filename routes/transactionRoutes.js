const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { createTransaction, getTransactions, getTransactionById } = require("../controllers/transactionController");
const router = express.Router()

router.post(
    '/',
    protect,
    createTransaction
)

router.get(
    '/',
    protect,
    getTransactions
)

router.get(
    '/:id',
    protect,
    getTransactionById
)

module.exports = router;