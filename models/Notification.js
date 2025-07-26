const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true,
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['LOW_STOCK', 'PAYMENT_DUE', 'COLLECTION_OVERDUE'],
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    link: {
        type: String 
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);