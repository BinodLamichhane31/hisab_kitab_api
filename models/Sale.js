const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    productName: { 
        type: String,
        required: true 
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    priceAtSale: { 
        type: Number,
        required: true
    },
    costAtSale: { 
        type: Number,
        required: true,
    },
    total: {
        type: Number,
        required: true
    }
}, { _id: false }); 

const saleSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        index: true 
    },
    saleType: {
        type: String,
        enum: ['CUSTOMER', 'CASH'],
        required: true
    },
    items: [saleItemSchema], 
    
    subTotal: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    grandTotal: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        required: true,
        default: 0
    },
    amountDue: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['PAID', 'PARTIAL', 'UNPAID'], 
        default: 'UNPAID'
    },
    saleDate: {
        type: Date,
        default: Date.now,
        index: true
    },
     status: {
        type: String,
        enum: ['COMPLETED', 'CANCELLED'],
        default: 'COMPLETED'
    },
    notes: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

saleSchema.pre('validate', function(next) {
    this.items.forEach(item => {
        item.total = item.quantity * item.priceAtSale;
    });

    this.subTotal = this.items.reduce((acc, item) => acc + item.total, 0);
    this.grandTotal = (this.subTotal - this.discount + this.tax);
    this.amountDue = this.grandTotal - this.amountPaid;

    if (this.amountDue <= 0) {
        this.paymentStatus = 'PAID';
        this.amountDue = 0; 
    } else if (this.amountPaid > 0) {
        this.paymentStatus = 'PARTIAL';
    } else {
        this.paymentStatus = 'UNPAID';
    }
    
    next();
});

module.exports = mongoose.model('Sale', saleSchema);