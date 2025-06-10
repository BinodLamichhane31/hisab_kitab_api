const { body } = require("express-validator");

exports.registerValidation = [
    body("fname").notEmpty().withMessage("First name is required"),
    body("lname").notEmpty().withMessage("Last name is required"),
    body("email").isEmail().withMessage("Invalid email format"),
    body("phone").isMobilePhone('ne-NP').withMessage("Invalid phone number."),
    body("password")
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,20}$/)
        .withMessage("Password must be 6–20 characters with uppercase, lowercase, digit, and special character"),
];

exports.loginValidation = [
    body("email").notEmpty().withMessage("Email is required"),
    body("password").notEmpty().withMessage("Password is required"),
];
