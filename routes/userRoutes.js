const express = require('express')
const { registerUser, loginUser, getProfile } = require('../controllers/authController')
const { registerValidation, loginValidation } = require('../validator/authValidator')
const validate = require('../middlewares/validate')
const loginLimiter = require('../middlewares/loginLimiter')
const { authenticateToken } = require('../middlewares/authMiddleware')
const router = express.Router()

router.post(
    "/register",
    registerValidation,
    validate,
    registerUser
)

router.post(
    "/login",
    loginLimiter,
    loginValidation,
    validate,
    loginUser
)

router.get(
    "/profile",
    authenticateToken,
    getProfile
)

module.exports = router