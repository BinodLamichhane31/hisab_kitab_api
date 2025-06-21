const express = require('express')
const { protect } = require('../middlewares/authMiddleware')
const { createShop, getShops } = require('../controllers/shopController')
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


module.exports = router