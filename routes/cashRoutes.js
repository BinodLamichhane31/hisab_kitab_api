const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { recordCashIn, recordCashOut } = require("../controllers/cashController");
const router = express.Router()

router.post(
    "/in",
    protect,
    recordCashIn
)

router.post(
    "/out",
    protect,
    recordCashOut
)

module.exports = router