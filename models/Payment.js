const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    transactionUUID: {
        type: String,
        required: true,
        unique: true,
    },
    productCode: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETE', 'FAILED'],
        default: 'PENDING',
    },
    esewaTransactionCode: { 
        type: String,
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);