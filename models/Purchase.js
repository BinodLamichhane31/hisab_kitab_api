const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
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
    unitCost: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
    billNumber: {
        type: String,
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true,
        index: true
    },
    items: [purchaseItemSchema],
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
    purchaseDate: {
        type: Date,
        default: Date.now,
        index: true
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

purchaseSchema.pre('validate', function(next) {
    this.items.forEach(item => {
        item.total = item.quantity * item.unitCost;
    });

    this.grandTotal = this.items.reduce((acc, item) => acc + item.total, 0);
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

purchaseSchema.index({ shop: 1, billNumber: 1, supplier: 1 }, { unique: true });

module.exports = mongoose.model('Purchase', purchaseSchema);