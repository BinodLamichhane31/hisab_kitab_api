const User = require("../models/User");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

/**
 * @desc    Register a new user
 * @route   PUT /api/v1/auth/register
 * @access  Public
 */
exports.registerUser = async (req, res) => {
  const { fname, lname, email, phone, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: "Email already exists.",
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({ 
        success: false,
        message: "This phone number is already used.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      fname,
      lname,
      email,
      phone,
      password: hashedPassword,
    });
    await newUser.save();

    return res.status(201).json({ // 201 Created
      success: true,
      message: "User Registered Successfully",
    });
  } catch (error) {
    return res.status(500).json({ // 500 Internal Server Error
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};

/**
 * @desc    Authenticate user and generate token (login)
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const getUser = await User.findOne({ email });
    if (!getUser) {
      return res.status(404).json({ 
        success: false,
        message: "User does not exist.",
      });
    }

    const checkPassword = await bcrypt.compare(password, getUser.password);
    if (!checkPassword) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid Password",
      });
    }

    const payload = {
      _id: getUser._id,
      fname: getUser.fname,
      lname: getUser.lname,
      email: getUser.email,
      phone: getUser.phone,
    };

    const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "7d" });

    const userData = await User.findById(getUser._id).select("-password");

    return res.status(200).json({ 
      success: true,
      message: "Login successful.",
      token,
      data: userData,
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: "Server Error",
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id; // from authenticateToken middleware

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

/**
 * @desc    Update user profile details
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  const userId = req.user._id;
  const { fname, lname, phone } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fname, lname, phone },
      { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
exports.changePassword = async (req, res) => {
  const userId = req.user._id;
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Old password is incorrect.",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/v1/auth/delete-account
 * @access  Private
 */
exports.deleteAccount = async (req, res) => {
  const userId = req.user._id;

  try {
    await User.findByIdAndDelete(userId);
    return res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};



