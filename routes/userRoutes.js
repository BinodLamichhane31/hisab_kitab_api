const express = require('express')
const { registerUser, loginUser } = require('../controllers/authController')
const { registerValidation, loginValidation } = require('../validator/authValidator')
const validate = require('../middlewares/validate')
const router = express.Router()

router.post(
    "/register",
    registerUser
)

router.post(
    "/login",
    loginUser
)

module.exports = router