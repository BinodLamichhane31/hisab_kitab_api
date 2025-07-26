const { default: mongoose } = require("mongoose");

const supplierSchema = new mongoose.Schema(
    {
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        phone:{
            type: String,
            required: true,
            trim: true
        },
        email:{
            type: String,
            required: true,
            trim: true
        },
        address: {  
            type: String,
            trim: true,
        },
        currentBalance: {
            type: Number,
            required: true,
            default: 0
        },
        totalSupplied: {
            type: Number,
            required: true,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

supplierSchema.index({ phone: 1, shop: 1 }, { unique: true });
module.exports = mongoose.model("Supplier",supplierSchema)