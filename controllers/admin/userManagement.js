const User = require("../../models/User");
const bcrypt = require("bcrypt");
const logger = require("../../utils/logger");

exports.createUser = async (req, res) => {
    const { fname, lname, email, phone, password } = req.body;
    try {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({ success: false, message: "This email is already used." });
        }

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(409).json({ success: false, message: "This phone is already used." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ fname, lname, email, phone, password: hashedPassword });
        await newUser.save();

        logger.info("[%s] %s created a new user: %s", req.user?.role, req.user?.email, email);
        return res.status(201).json({ success: true, message: "New user added." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;

        const skip = (page - 1) * limit;
        const sortField = req.query.sortField || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const sortBy = { [sortField]: sortOrder };

        const searchQuery = {
            $or: [
                { fname: { $regex: search, $options: 'i' } },
                { lname: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        };

        const totalUsers = await User.countDocuments(searchQuery);
        const users = await User.find(searchQuery)
            .sort(sortBy)
            .skip(skip)
            .limit(Number(limit))
            .select('-password');
        
        // logger.info("[%s] %s fetched all user", req.user?.role, req.user?.email);

        return res.status(200).json({
            success: true,
            message: "Users data fetched",
            data: users,
            pagination: {
                totalUsers,
                currentPage: Number(page),
                totalPages: Math.ceil(totalUsers / limit),
                limit: Number(limit)
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Server Error"+error });
        
    }
};

exports.getUserById = async (req,res) => {
    try {
        const user = await User.findById(req.params.id).select("-password")

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found."
            })
        }

        logger.info("[%s] %s viewed user with email: %s", req.user?.role, req.user?.email, req.params.email);

        return res.status(200).json({
            success: true,
            message: "User data fetched.",
            data: user
        })


        
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Internal Server Error: "+error
        })
        
    }
}

exports.updateUserByAdmin = async (req, res) => {
  const { fname, lname, phone, role } = req.body;
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { fname, lname, phone, role },
      { new: true, runValidators: true }
    ).select("-password");
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    logger.info("[%s] %s updated user: %s", req.user?.role, req.user?.email, updated.email);
    return res.status(200).json({
        success: true, 
        message: "User updated.", 
        data: updated 
    });
  } catch (error) {
    return res.status(500).json({
        success: false, 
        message: `Server error: ${error.message}` 
    });
  }
};

exports.deleteUserByAdmin = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    logger.info("[%s] %s deleted user: %s", req.user?.role, req.user?.email, deletedUser.email);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};

exports.toggleUserStatus = async (req,res) =>{
    try {
        const user = await User.findById(req.params.id)
        if(!user){
            return res.status(404).json({
                success:false,
                message: "User not found."
            })
        }

        user.isActive = !user.isActive
        await user.save();

        logger.info("[%s] %s toggled user %s status to: %s", req.user?.role, req.user?.email, user.email, user.isActive ? "active" : "inactive");

        return res.status(200).json({
            success: true, 
            message: `User ${user.isActive ? "enabled" : "disabled"}.` 
        });

        
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: `Server error: ${error.message}` 
        });
        
    }

}



