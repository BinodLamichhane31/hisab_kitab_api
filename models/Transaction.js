const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    type: { 
        type: String,
        enum: ['CASH_IN', 'CASH_OUT'],
        required: true
    },
    category: { 
        type: String,
        enum: [
            'SALE_PAYMENT', 'PURCHASE_PAYMENT', 'EXPENSE_RENT', 
            'EXPENSE_SALARY', 'EXPENSE_UTILITIES', 'OWNER_DRAWING', 
            'CAPITAL_INJECTION', 'OTHER_INCOME', 'OTHER_EXPENSE',"SALE_RETURN","PURCHASE_RETURN"
        ],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'CREDIT'],
        default: 'CASH'
    },
    transactionDate: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        trim: true
    },
    relatedSale: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    },
    relatedPurchase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Purchase'
    },
    relatedCustomer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    relatedSupplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);