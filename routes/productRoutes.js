const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { addProduct, getProductsByShop, getProductById, updateProduct, deleteProduct } = require("../controllers/productController");
const router = express.Router()

router.post(
    "/",
    protect,
    addProduct
)

router.get(
    '/',
    protect,
    getProductsByShop
)

router.get(
    '/:productId',
    protect,
    getProductById
)

router.put(
    '/:productId',
    protect,
    updateProduct
)

router.delete(
    '/:productId',
    protect,
    deleteProduct
)

module.exports = router