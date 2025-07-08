const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { addCustomer, getCustomersByShop, getCustomerById, updateCustomer, deleteCustomer } = require("../controllers/customerController");
const router = express.Router()

router.post(
    "/",
    protect,
    addCustomer
)

router.get(
    '/',
    protect,
    getCustomersByShop
)

router.get(
    '/:customerId',
    protect,
    getCustomerById
)

router.put(
    '/:customerId',
    protect,
    updateCustomer
)

router.delete(
    '/:customerId',
    protect,
    deleteCustomer
)

module.exports = router