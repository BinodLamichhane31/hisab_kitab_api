const Transaction = require('../models/Transaction');
const Shop = require('../models/Shop');

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


exports.createTransaction = async (req, res) => {
    const { 
        shopId, 
        type, 
        category, 
        amount, 
        paymentMethod, 
        description, 
        transactionDate 
    } = req.body;
    
    if (['SALE_PAYMENT', 'PURCHASE_PAYMENT', 'SALE_RETURN'].includes(category)) {
        return res.status(400).json({ success: false, message: `Category '${category}' cannot be created manually. It is handled by sale/purchase endpoints.` });
    }

    try {
        const { error, status } = await verifyShopOwner(shopId, req.user._id);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        const newTransaction = await Transaction.create({
            shop: shopId,
            type,
            category,
            amount,
            paymentMethod,
            description,
            transactionDate,
            createdBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: 'Transaction recorded successfully.',
            data: newTransaction,
        });

    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// ... other imports: Transaction, verifyShopOwner, etc. ...

exports.getTransactions = async (req, res) => {
    try {
        const {
            shopId,
            page = 1,
            limit = 30,
            search = '',
            sortBy = 'transactionDate',
            sortOrder = 'desc',
            type, 
            category,
            startDate,
            endDate,
            relatedCustomer, // Renamed for clarity to match the model field
            relatedSupplier, // Renamed for clarity to match the model field
        } = req.query;

        if (!shopId) {
            return res.status(400).json({ success: false, message: 'Shop ID is required.' });
        }

        const { error, status } = await verifyShopOwner(shopId, req.user._id);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        // Base query always filters by shop
        const query = { shop: shopId };

        // Apply filters if they are provided in the request
        if (search) {
            query.description = { $regex: search, $options: 'i' };
        }
        if (type) {
            query.type = type;
        }
        if (category) {
            query.category = category;
        }

        // --- THE FIX IS HERE ---
        // Add the customer or supplier ID to the query if it exists
        if (relatedCustomer) {
            query.relatedCustomer = relatedCustomer;
        }
        if (relatedSupplier) {
            query.relatedSupplier = relatedSupplier;
        }
        // --- END FIX ---

        if (startDate || endDate) {
            query.transactionDate = {};
            if (startDate) query.transactionDate.$gte = new Date(startDate);
            if (endDate) query.transactionDate.$lte = new Date(endDate);
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transactions = await Transaction.find(query)
            .populate('relatedCustomer', 'name')
            .populate('relatedSupplier', 'name')
            .populate('createdBy', 'fname lname')
            .sort({createdAt: -1, transactionDate: -1})
            .skip(skip)
            .limit(parseInt(limit));
        
        const totalTransactions = await Transaction.countDocuments(query);

        res.status(200).json({
            success: true,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalTransactions / limit),
                totalTransactions,
            },
            data: transactions,
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};


exports.getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('relatedCustomer', 'name phone')
            .populate('relatedSupplier', 'name phone')
            .populate('relatedSale', 'invoiceNumber grandTotal')
            .populate('relatedPurchase', 'billNumber grandTotal')
            .populate('createdBy', 'fname lname');

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }
        
        const { error, status } = await verifyShopOwner(transaction.shop, req.user._id);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        res.status(200).json({ success: true, data: transaction });

    } catch (error) {
        if (error.name === 'CastError') {
             return res.status(400).json({ success: false, message: `Invalid Transaction ID format: ${req.params.id}` });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};