const express = require('express')
const { registerUser, loginUser, getProfile, updateProfile, changePassword, deleteAccount, logout, uploadProfileImage, viewProfileImage, selectShop } = require('../controllers/authController')
const { registerValidation, loginValidation } = require('../validator/authValidator')
const validate = require('../middlewares/validate')
const loginLimiter = require('../middlewares/loginLimiter')
const { protect } = require('../middlewares/authMiddleware')
const upload = require('../middlewares/upload')
const router = express.Router()

router.post(
    "/register",
    registerValidation,
    validate,
    registerUser
)

const loginMiddleware = [
    loginValidation,
    validate
];

if (process.env.NODE_ENV !== 'test') {
    loginMiddleware.unshift(loginLimiter);
}

router.post(
    "/login",
    ...loginMiddleware, 
    loginUser
);
router.get(
    "/profile",
    protect,
    getProfile
)

router.put(
  "/profile",
  protect,
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

router.put(
  "/upload-profile-image",
  protect,
  upload.single('image'),
  uploadProfileImage
)
router.get(
  "/uploads/:filename", 
  viewProfileImage
);


module.exports = router