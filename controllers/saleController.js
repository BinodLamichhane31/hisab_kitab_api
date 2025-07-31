const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Shop = require('../models/Shop');
const Transaction = require('../models/Transaction');
const { query } = require('winston');

const verifyShopOwner = async (shopId, userId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        return { error: 'Shop not found.', status: 404 };
    }
    if (shop.owner.toString() !== userId.toString()) {
        return { error: 'You are not authorized to manage this shop.', status: 403 };
    }
    return { shop };
};

exports.createSale = async (req, res) => {
    const { shopId, customerId, items, discount, tax, amountPaid, notes, saleDate } = req.body;
    const userId = req.user._id;

    const isTestEnv = process.env.NODE_ENV === 'test';
    const session = isTestEnv ? null : await mongoose.startSession();
    if (!isTestEnv) {
        session.startTransaction();
    }

    try {
        const { error, status } = await verifyShopOwner(shopId, userId);
        if (error) {
            if (!isTestEnv) await session.abortTransaction(); // Abort if session exists
            return res.status(status).json({ success: false, message: error });
        }
        
        let customer = null;
        const isCashSale = !customerId;

        if (!isCashSale) {
            customer = await Customer.findById(customerId).session(session);
            if (!customer || customer.shop.toString() !== shopId) {
                throw new Error('Invalid customer for this shop.');
            }
        }

        const processedItems = [];
        await Promise.all(items.map(async (item) => {
            const product = await Product.findById(item.productId).session(session);
            if (!product) throw new Error(`Product with ID ${item.productId} not found.`);
            if (product.shopId.toString() !== shopId) throw new Error(`Product ${product.name} does not belong to this shop.`);
            if (product.quantity < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Required: ${item.quantity}.`);
            }

            product.quantity -= item.quantity;
            await product.save({ session });

            processedItems.push({
                product: product._id,
                productName: product.name,
                quantity: item.quantity,
                priceAtSale: item.priceAtSale || product.sellingPrice,
                costAtSale: product.purchasePrice,
            });
        }));
        
        const newSaleData = {
            invoiceNumber: `SALE-${Date.now()}`,
            shop: shopId,
            items: processedItems,
            discount,
            tax,
            amountPaid,
            notes,
            saleDate,
            createdBy: userId,
            saleType: isCashSale ? 'CASH' : 'CUSTOMER',
            ...( !isCashSale && { customer: customerId }) 
        };
        
        const newSale = new Sale(newSaleData);
        await newSale.save({ session });
        
        if (!isCashSale) {
            customer.currentBalance += newSale.amountDue;
            customer.totalSpent += newSale.amountPaid; 
            await customer.save({ session });
        } else {
            if (newSale.amountDue > 0) {
                throw new Error('Cash sales must be paid in full. Amount due cannot be greater than zero.');
            }
        }

        if (newSale.amountPaid > 0) {
            const transactionData = {
                shop: shopId,
                type: 'CASH_IN',
                category: 'SALE_PAYMENT',
                amount: newSale.amountPaid,
                description: `Payment for Invoice #${newSale.invoiceNumber}`,
                relatedSale: newSale._id,
                createdBy: userId,
                ...( !isCashSale && { relatedCustomer: customerId })
            };
            await Transaction.create([transactionData], { session });
        }

        if (!isTestEnv) {
            await session.commitTransaction();
        }
        res.status(201).json({ 
            success: true, 
            message: `Sale created successfully (${isCashSale ? 'Cash Sale' : 'Customer Sale'}).`, 
            data: newSale 
        });

    } catch (error) {
        if (!isTestEnv) {
            await session.abortTransaction();
        }
        res.status(400).json({ success: false, message: error.message });
    } finally {
        if (!isTestEnv) {
            session.endSession();
        }
    }
};


exports.getSales = async (req, res) => {
    try {
        const { shopId, page = 1, limit = 10, search = "", customerId, saleType } = req.query;
        
        const { error, status } = await verifyShopOwner(shopId, req.user._id);
        if (error) return res.status(status).json({ success: false, message: error });

        const query = { shop: shopId };
        if (search) query.invoiceNumber = { $regex: search, $options: 'i' };
        if (customerId) query.customer = customerId;
        if (saleType) query.saleType = saleType.toUpperCase(); 

        const sales = await Sale.find(query)
            .populate('customer', 'name phone') 
            .sort({createdAt: -1, saleDate: -1})
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalSales = await Sale.countDocuments(query);

        res.status(200).json({
            success: true,
            data: sales,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(totalSales / limit),
                totalSales,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};


exports.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const sale = await Sale.findById(id)
            .populate('customer', 'name phone email address currentBalance') 
            .populate('items.product', 'name description category') 
            .populate('createdBy', 'fname lname');

        if (!sale) {
            return res.status(404).json({ success: false, message: 'Sale not found.' });
        }

        const { error, status } = await verifyShopOwner(sale.shop, userId);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        res.status(200).json({ success: true, data: sale });

    } catch (error) {
        if (error.name === 'CastError') {
             return res.status(400).json({ success: false, message: `Invalid Sale ID format: ${req.params.id}` });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};


exports.cancelSale = async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Sale.findById(id).session(session);
        if (!sale) {
            throw new Error('Sale not found.');
        }

        if (sale.status === 'CANCELLED') {
            throw new Error('This sale has already been cancelled.');
        }

        const { error } = await verifyShopOwner(sale.shop, userId);
        if (error) {
            throw new Error('Authorization failed.');
        }

        // 1. Restore Product Stock
        await Promise.all(sale.items.map(async (item) => {
            await Product.updateOne(
                { _id: item.product },
                { $inc: { quantity: item.quantity } }, 
                { session }
            );
        }));

        if (sale.saleType === 'CUSTOMER' && sale.customer) {
            const customer = await Customer.findById(sale.customer).session(session);
            if (customer) {
                customer.currentBalance -= sale.amountDue;
                customer.totalSpent -= sale.amountPaid;
                await customer.save({ session });
            }
        }

        if (sale.amountPaid > 0) {
            await Transaction.create([{
                shop: sale.shop,
                type: 'CASH_OUT', 
                category: 'SALE_RETURN', 
                amount: sale.amountPaid,
                description: `Reversal/Cancellation of Invoice #${sale.invoiceNumber}`,
                relatedSale: sale._id,
                relatedCustomer: sale.customer,
                createdBy: userId
            }], { session });
        }

        sale.status = 'CANCELLED';
        await sale.save({ session });

        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Sale has been successfully cancelled.', data: sale });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};


exports.recordPaymentForSale = async (req, res) => {    
    const { id } = req.params;
    const { amountPaid, paymentMethod } = req.body;
    const userId = req.user._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Sale.findById(id).session(session);
        if (!sale) throw new Error('Sale not found.');
        if (sale.saleType === 'CASH') throw new Error('Cannot record additional payments for a cash sale.');
        if (sale.paymentStatus === 'PAID') throw new Error('This sale is already fully paid.');
        
        const { error } = await verifyShopOwner(sale.shop, userId);
        if (error) throw new Error('Authorization failed.');

        const customer = await Customer.findById(sale.customer).session(session);
        if (!customer) throw new Error('Associated customer not found.');

        sale.amountPaid += amountPaid;
        customer.currentBalance -= amountPaid;
        customer.totalSpent += amountPaid;
        
        await sale.save({ session }); 
        await customer.save({ session });

        await Transaction.create([{
            shop: sale.shop,
            type: 'CASH_IN',
            category: 'SALE_PAYMENT',
            amount: amountPaid,
            paymentMethod,
            description: `Additional payment for Invoice #${sale.invoiceNumber}`,
            relatedSale: sale._id,
            relatedCustomer: sale.customer,
            createdBy: userId
        }], { session });
        
        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Payment recorded successfully.', data: sale });

    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

