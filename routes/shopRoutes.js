const express = require('express')
const { protect } = require('../middlewares/authMiddleware')
const { createShop, getShops, getShopById, updateShop, deleteShop } = require('../controllers/shopController')
const { selectShop } = require('../controllers/authController')
const router = express.Router()

router.post(
    "/",
    protect,
    createShop
)

router.get(
    '/',
    protect,
    getShops
)

router.get(
    '/:id',
    protect,
    getShopById
)

router.put(
    '/:id',
    protect,
    updateShop
)

router.delete(
    '/:id',
    protect,
    deleteShop
)

router.post(
  "/select-shop",
  protect,
  selectShop
);


module.exports = router