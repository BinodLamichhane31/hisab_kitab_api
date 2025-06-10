const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


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
