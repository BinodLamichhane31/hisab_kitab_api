const express = require('express')
const { route } = require('../userRoutes')
const { createUser, getAllUsers, updateUserByAdmin, deleteUserByAdmin, toggleUserStatus } = require('../../controllers/admin/userManagement')
const { registerValidation } = require('../../validator/authValidator')
const validate = require('../../middlewares/validate')
const { protect, authorize } = require('../../middlewares/authMiddleware')
const router = express.Router()

router.post(
    '/create',
    protect,
    authorize('admin'),
    registerValidation,
    validate,
    createUser
)

router.get(
    '/users',
    protect,
    authorize('admin'),
    getAllUsers
)

router.put(
    '/users/:id',
    protect,
    authorize('admin'),
    updateUserByAdmin
)

router.delete(
    '/users/:id',
    protect,
    authorize('admin'),
    deleteUserByAdmin
)

router.patch(
    '/users/:id/status',
    protect,
    authorize('admin'),
    toggleUserStatus
)

module.exports = router