const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

exports.protect = async (req, res, next) => {    
    let token;

    if (req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        
    }
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token'
        });
    }
    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);

        const currentUser = await User.findById(decodedPayload.id).select('-password');

        if (!currentUser) {
            return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
        }

        if (!currentUser.isActive) {
            return res.status(403).json({ success: false, message: 'Forbidden: Account is disabled' });
        }

        req.user = currentUser;
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, token failed'
        });
    }
};


exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};