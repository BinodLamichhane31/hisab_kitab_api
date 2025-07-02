const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const sendTokenToResponse = (user, statusCode, res) =>{
  const token = jwt.sign({id: user._id, role: user.role},process.env.JWT_SECRET,{
    expiresIn:process.env.JWT_EXPIRE
  })
  const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true, 
    };

  if(process.env.NODE_ENV=="production"){
    options.secure = true
  }

  const userResponse = { ...user.toObject() };
  delete userResponse.password;

  res.status(statusCode)
    .cookie('token',token,options)
    .json({
      success:true,
      message:"Login successful.",
      token
    })

}

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

    return res.status(201).json({ 
      success: true,
      message: "User Registered Successfully",
    });
  } catch (error) {
    return res.status(500).json({ 
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

    if(!getUser.isActive){
      return res.status(403).json({
        success:false,
        message: "Your account has been disabled. Please contact support."
      })
    }

    const checkPassword = await bcrypt.compare(password, getUser.password);
    if (!checkPassword) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid Password",
      });
    }

    getUser.lastLogin = Date.now();
    await getUser.save({validateBeforeSave:false})

    sendTokenToResponse(getUser,200,res)

    
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: "Server Error "+error,
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    message:"Fetched profile data",
    data: req.user,
  });
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

exports.logout = async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(0),
        httpOnly: true,
    });
    res.status(200).json({ success: true, message: "Logged out." });
};

exports.uploadProfileImage = async (req, res) => {
  const userId = req.user._id;

  try {
    if(!req.file){
      res.status(400).json({
        success: false,
        message:"No image file uploaded."
      })
    }
    const relativePath = path.join("uploads",req.file.filename)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: relativePath },
      { new: true}
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded.",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};

exports.viewProfileImage = (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, "..", "uploads", filename);

  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({
      success: false,
      message: "Image not found.",
    });
  }

  return res.sendFile(imagePath);
};




