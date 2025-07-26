const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Transaction = require('../models/Transaction');
const { verifyShopOwner } = require('../utils/verifyShopOwner'); 

exports.recordCashIn = async (req, res) => {
    const { shopId, customerId, amount, paymentMethod, notes, transactionDate } = req.body;
    const userId = req.user._id;

    if (!customerId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Customer and a valid positive amount are required.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { error } = await verifyShopOwner(shopId, userId);
        if (error) throw new Error(error);

        const customer = await Customer.findById(customerId).session(session);
        if (!customer || customer.shop.toString() !== shopId) {
            throw new Error('Invalid customer for this shop.');
        }
        if (customer.currentBalance < amount) {
             throw new Error(`Payment amount (Rs. ${amount}) exceeds customer's total due (Rs. ${customer.currentBalance}).`);
        }

        const unpaidSales = await Sale.find({
            customer: customerId,
            status: 'COMPLETED',
            paymentStatus: { $in: ['UNPAID', 'PARTIAL'] }
        }).sort({ saleDate: 1 }).session(session);

        let remainingAmountToApply = amount;
        
        for (const sale of unpaidSales) {
            if (remainingAmountToApply <= 0) break;
            const dueOnThisSale = sale.amountDue;
            const paymentForThisSale = Math.min(remainingAmountToApply, dueOnThisSale);
            sale.amountPaid += paymentForThisSale;
            await sale.save({ session });
            remainingAmountToApply -= paymentForThisSale;
        }

        customer.currentBalance -= amount;
        customer.totalSpent +=amount
        await customer.save({ session });
        

        const transactionData = {
            shop: shopId,
            type: 'CASH_IN',
            category: 'SALE_PAYMENT',
            amount: amount,
            paymentMethod,
            description: notes || `Bulk payment received from ${customer.name}.`,
            relatedCustomer: customerId,
            createdBy: userId
        };

        if (transactionDate && !isNaN(new Date(transactionDate))) {
            transactionData.transactionDate = new Date(transactionDate);
        }

        
        await Transaction.create([transactionData], { session });

        await session.commitTransaction();
        res.status(200).json({
            success: true,
            message: `Rs. ${amount} payment from ${customer.name} applied successfully.`
        });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

exports.recordCashOut = async (req, res) => {
    const { shopId, supplierId, amount, paymentMethod, notes, transactionDate } = req.body;
    const userId = req.user._id;

    if (!supplierId || !amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Supplier and a valid positive amount are required.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { error } = await verifyShopOwner(shopId, userId);
        if (error) throw new Error(error);

        const supplier = await Supplier.findById(supplierId).session(session);
        if (!supplier || supplier.shop.toString() !== shopId) {
            throw new Error('Invalid supplier for this shop.');
        }
        if (supplier.currentBalance < amount) {
             throw new Error(`Payment amount (Rs. ${amount}) exceeds total payable to supplier (Rs. ${supplier.currentBalance}).`);
        }

        const unpaidPurchases = await Purchase.find({
            supplier: supplierId,
            status: 'COMPLETED',
            paymentStatus: { $in: ['UNPAID', 'PARTIAL'] }
        }).sort({ purchaseDate: 1 }).session(session);

        let remainingAmountToApply = amount;
        
        for (const purchase of unpaidPurchases) {
            if (remainingAmountToApply <= 0) break;
            const dueOnThisPurchase = purchase.amountDue;
            const paymentForThisPurchase = Math.min(remainingAmountToApply, dueOnThisPurchase);
            purchase.amountPaid += paymentForThisPurchase;
            await purchase.save({ session });
            remainingAmountToApply -= paymentForThisPurchase;
        }

        supplier.currentBalance -= amount;
        supplier.totalSupplied += amount;
        await supplier.save({ session });
        
        const transactionData = {
            shop: shopId,
            type: 'CASH_OUT',
            category: 'PURCHASE_PAYMENT',
            amount: amount,
            paymentMethod,
            description: notes || `Bulk payment made to ${supplier.name}.`,
            relatedSupplier: supplierId,
            createdBy: userId
        };

        if (transactionDate && !isNaN(new Date(transactionDate))) {
            transactionData.transactionDate = new Date(transactionDate);
        }
        
        await Transaction.create([transactionData], { session });

        await session.commitTransaction();
        res.status(200).json({
            success: true,
            message: `Rs. ${amount} payment to ${supplier.name} applied successfully.`
        });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};