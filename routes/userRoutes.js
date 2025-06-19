const express = require('express')
const { registerUser, loginUser, getProfile, updateProfile, changePassword, deleteAccount, logout } = require('../controllers/authController')
const { registerValidation, loginValidation } = require('../validator/authValidator')
const validate = require('../middlewares/validate')
const loginLimiter = require('../middlewares/loginLimiter')
const { protect } = require('../middlewares/authMiddleware')
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
    protect,
    getProfile
)

router.put(
  "/profile",
  protect,
  validate,
  updateProfile
);

router.put(
  "/change-password",
  protect,
  validate,
  changePassword
);

router.delete(
  "/delete-account",
  protect,
  deleteAccount
);

router.post(
  "/logout",
  protect,
  logout
)

module.exports = router