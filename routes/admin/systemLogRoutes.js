const express = require('express')
const { getLogs } = require('../../controllers/admin/systemLogController')
const { protect, authorize } = require('../../middlewares/authMiddleware')
const router = express.Router()

router.get(
    '/logs',
    protect,
    authorize('admin'),
    getLogs
)

module.exports = router

