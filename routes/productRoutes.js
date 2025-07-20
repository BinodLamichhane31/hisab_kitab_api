const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { addProduct, getProductsByShop, getProductById, updateProduct, deleteProduct } = require("../controllers/productController");
const upload = require("../middlewares/upload");
const router = express.Router()

router.post(
    "/",
    protect,
    upload.single('productImage'),
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
    upload.single('productImage'),
    updateProduct
)

router.delete(
    '/:productId',
    protect,
    deleteProduct
)

module.exports = router