const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Shop = require('../models/Shop');
const Transaction = require('../models/Transaction');

const verifyShopOwner = async (shopId, userId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) return { error: 'Shop not found.', status: 404 };
    if (shop.owner.toString() !== userId.toString()) return { error: 'Not authorized for this shop.', status: 403 };
    return { shop };
};


exports.createPurchase = async (req, res) => {
    const { shopId, supplierId, items, billNumber, discount, amountPaid, notes, purchaseDate } = req.body;
    const userId = req.user._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { error, status } = await verifyShopOwner(shopId, userId);
        if (error) {
            await session.abortTransaction();
            return res.status(status).json({ success: false, message: error });
        }

        let supplier = null;
        const isCashPurchase = !supplierId;

        if (!isCashPurchase) {
            supplier = await Supplier.findById(supplierId).session(session);
            if (!supplier || supplier.shop.toString() !== shopId) {
                throw new Error('Invalid supplier for this shop.');
            }
        }

        const processedItems = [];
        await Promise.all(items.map(async (item) => {
            const product = await Product.findById(item.productId).session(session);
            if (!product) throw new Error(`Product with ID ${item.productId} not found.`);
            if (product.shopId.toString() !== shopId) throw new Error(`Product ${product.name} does not belong to this shop.`);

            product.quantity += item.quantity;
            product.purchasePrice = item.unitCost;
            await product.save({ session });

            processedItems.push({
                product: product._id,
                productName: product.name,
                quantity: item.quantity,
                unitCost: item.unitCost,
            });
        }));

        const newPurchaseData = {
            billNumber: billNumber || `PURCHASE-${Date.now()}`,
            shop: shopId,
            items: processedItems,
            discount,
            amountPaid,
            notes,
            purchaseDate,
            createdBy: userId,
            purchaseType: isCashPurchase ? 'CASH' : 'SUPPLIER',
            ...(!isCashPurchase && { supplier: supplierId })
        };

        const newPurchase = new Purchase(newPurchaseData);
        await newPurchase.save({ session });

        if (!isCashPurchase) {
            supplier.currentBalance += newPurchase.amountDue;
            supplier.totalSupplied += newPurchase.amountPaid
            await supplier.save({ session });
        } else {
            if (newPurchase.amountDue > 0) {
                throw new Error('Cash purchases must be paid in full.');
            }
        }

        if (newPurchase.amountPaid > 0) {
            const transactionData = {
                shop: shopId,
                type: 'CASH_OUT',
                category: 'PURCHASE_PAYMENT',
                amount: newPurchase.amountPaid,
                description: `Payment for Bill #${newPurchase.billNumber}`,
                relatedPurchase: newPurchase._id,
                createdBy: userId,
                ...(!isCashPurchase && { relatedSupplier: supplierId })
            };
            await Transaction.create([transactionData], { session });
        }

        await session.commitTransaction();
        res.status(201).json({
            success: true,
            message: `Purchase recorded successfully (${isCashPurchase ? 'Cash Purchase' : 'Supplier Purchase'}).`,
            data: newPurchase
        });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

exports.getPurchases = async (req, res) => {
    try {
        const { shopId, page = 1, limit = 10, search = "", supplierId, purchaseType } = req.query;
        
        const { error, status } = await verifyShopOwner(shopId, req.user._id);
        if (error) return res.status(status).json({ success: false, message: error });

        const query = { shop: shopId };
        if (search) query.billNumber = { $regex: search, $options: 'i' };
        if (supplierId) query.supplier = supplierId;
        if (purchaseType) query.purchaseType = purchaseType.toUpperCase();

        const purchases = await Purchase.find(query)
            .populate('supplier', 'name phone')
            .sort({createdAt: -1, purchaseDate: -1})
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalPurchases = await Purchase.countDocuments(query);

        res.status(200).json({
            success: true,
            data: purchases,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalPurchases / limit),
                totalPurchases,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

exports.getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const purchase = await Purchase.findById(id)
            .populate('supplier', 'name phone email address currentBalance') 
            .populate('items.product', 'name description category') 
            .populate('createdBy', 'fname lname');

        if (!purchase) {
            return res.status(404).json({ success: false, message: 'Purchase not found.' });
        }

        const { error, status } = await verifyShopOwner(purchase.shop, userId);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        res.status(200).json({
            success: true,
            data: purchase,
        });

    } catch (error) {
        if (error.name === 'CastError') {
             return res.status(400).json({ success: false, message: `Invalid Purchase ID format: ${req.params.id}` });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};


exports.recordPaymentForPurchase = async (req, res) => {
    const { id } = req.params;
    const { amountPaid, paymentMethod } = req.body;
    const userId = req.user._id;

    if (!amountPaid || isNaN(amountPaid) || amountPaid <= 0) {
        return res.status(400).json({ success: false, message: "A valid positive payment amount is required." });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const purchase = await Purchase.findById(id).session(session);
        if (!purchase) throw new Error('Purchase not found.');
        if (purchase.purchaseType === 'CASH') throw new Error('Cannot record additional payments for a cash purchase.');
        if (purchase.paymentStatus === 'PAID') throw new Error('This purchase is already fully paid.');

        const { error } = await verifyShopOwner(purchase.shop, userId);
        if (error) throw new Error('Authorization failed.');

        const supplier = await Supplier.findById(purchase.supplier).session(session);
        if (!supplier) throw new Error('Associated supplier not found for this purchase.');

        purchase.amountPaid += amountPaid;
        supplier.currentBalance -= amountPaid;
        supplier.totalSupplied += amountPaid;

        await purchase.save({ session });
        await supplier.save({ session });

        await Transaction.create([{
            shop: purchase.shop,
            type: 'CASH_OUT',
            category: 'PURCHASE_PAYMENT',
            amount: amountPaid,
            paymentMethod,
            description: `Payment for Bill #${purchase.billNumber}`,
            relatedPurchase: purchase._id,
            relatedSupplier: purchase.supplier,
            createdBy: userId
        }], { session });

        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Payment recorded successfully.', data: purchase });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

exports.cancelPurchase = async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const purchase = await Purchase.findById(id).session(session);
        if (!purchase) throw new Error('Purchase not found.');
        if (purchase.status === 'CANCELLED') throw new Error('This purchase has already been cancelled.');

        const { error } = await verifyShopOwner(purchase.shop, userId);
        if (error) throw new Error('Authorization failed.');

        await Promise.all(purchase.items.map(async (item) => {
            const product = await Product.findById(item.product).session(session);
            if(product.quantity < item.quantity){
                throw new Error(`Cannot cancel purchase. Not enough stock for ${product.name} to return. Current stock: ${product.quantity}, return required: ${item.quantity}.`);
            }
            await Product.updateOne(
                { _id: item.product },
                { $inc: { quantity: -item.quantity } }, 
                { session }
            );
        }));

        if (purchase.purchaseType === 'SUPPLIER' && purchase.supplier) {
            const supplier = await Supplier.findById(purchase.supplier).session(session);
            if (supplier) {
                supplier.currentBalance -= purchase.amountDue;
                supplier.totalSupplied -= purchase.amountPaid
                await supplier.save({ session });
            }
        }

        if (purchase.amountPaid > 0) {
            await Transaction.create([{
                shop: purchase.shop,
                type: 'CASH_IN', 
                category: 'PURCHASE_RETURN',
                amount: purchase.amountPaid,
                description: `Reversal/Cancellation of Bill #${purchase.billNumber}`,
                relatedPurchase: purchase._id,
                relatedSupplier: purchase.supplier,
                createdBy: userId
            }], { session });
        }

        purchase.status = 'CANCELLED';
        await purchase.save({ session });

        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Purchase has been successfully cancelled.', data: purchase });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};