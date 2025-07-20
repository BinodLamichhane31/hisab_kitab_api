const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required.'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    category: {
        type: String,
        trim: true,
    },
    purchasePrice: {
        type: Number,
        required: [true, 'Purchase price is required.'],
        default: 0,
    },
    sellingPrice: {
        type: Number,
        required: [true, 'Selling price is required.'],
    },
    quantity: {
        type: Number,
        required: [true, 'Stock quantity is required.'],
        default: 0,
    },
    reorderLevel: {
        type: Number,
        default: 5, 
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true,
    },
    image: { type: String, required: false } 
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);