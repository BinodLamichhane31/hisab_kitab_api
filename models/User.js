const { default: mongoose } = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
    plan: {
        type: String,
        enum: ['FREE', 'PRO'],
        default: 'FREE'
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE', 'EXPIRED'],
        default: 'ACTIVE'
    },
    expiresAt: {
        type: Date,
        default: () => new Date(new Date().setFullYear(new Date().getFullYear() + 100)) 
    }
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    fname: {
      type: String,
      required: true,
    },
    lname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImage: {
      type:String,
      default:""
    },
    shops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
      },
    ],
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    subscription: {
        type: subscriptionSchema,
        default: () => ({}) 
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    activeShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop'
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User",userSchema)
