const mongoose = require('mongoose'); // <-- STEP 1: Import Mongoose
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
// Assuming you have a verifyShopOwner helper. If it's in the same file, that's fine too.
const { verifyShopOwner } = require('../utils/verifyShopOwner'); 

// ... verifyShopOwner function if it's here ...

/**
 * @desc    Get key statistics for the dashboard stat cards.
 * @route   GET /api/v1/dashboard/stats
 * @access  Private
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const { shopId } = req.query;
        const userId = req.user._id;

        const { error, status } = await verifyShopOwner(shopId, userId);
        if (error) return res.status(status).json({ success: false, message: error });

        // STEP 2: Convert the string ID to a MongoDB ObjectId
        const shopObjectId = new mongoose.Types.ObjectId(shopId);

        const [
            customerCount,
            supplierCount,
            receivableResult,
            payableResult
        ] = await Promise.all([
            Customer.countDocuments({ shop: shopObjectId }),
            Supplier.countDocuments({ shop: shopObjectId }),
            Customer.aggregate([
                // STEP 3: Use the converted ObjectId in the $match stage
                { $match: { shop: shopObjectId } },
                { $group: { _id: null, total: { $sum: "$currentBalance" } } }
            ]),
            Supplier.aggregate([
                { $match: { shop: shopObjectId } },
                { $group: { _id: null, total: { $sum: "$currentBalance" } } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalCustomers: customerCount,
                totalSuppliers: supplierCount,
                receivableAmount: receivableResult[0]?.total || 0,
                payableAmount: payableResult[0]?.total || 0,
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

/**
 * @desc    Get aggregated data for the sales vs purchases chart.
 * @route   GET /api/v1/dashboard/chart
 * @access  Private
 */
exports.getChartData = async (req, res) => {
    try {
        const { shopId } = req.query;
        const userId = req.user._id;

        const { error, status } = await verifyShopOwner(shopId, userId);
        if (error) return res.status(status).json({ success: false, message: error });

        // Convert string ID to ObjectId here as well
        const shopObjectId = new mongoose.Types.ObjectId(shopId);

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const [salesData, purchasesData] = await Promise.all([
            Sale.aggregate([
                // Use the converted ObjectId
                { $match: { shop: shopObjectId, status: 'COMPLETED', saleDate: { $gte: twelveMonthsAgo } } },
                { $group: { 
                    _id: { year: { $year: "$saleDate" }, month: { $month: "$saleDate" } },
                    total: { $sum: "$grandTotal" } 
                }},
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]),
            Purchase.aggregate([
                // Use the converted ObjectId
                { $match: { shop: shopObjectId, status: 'COMPLETED', purchaseDate: { $gte: twelveMonthsAgo } } },
                { $group: {
                    _id: { year: { $year: "$purchaseDate" }, month: { $month: "$purchaseDate" } },
                    total: { $sum: "$grandTotal" }
                }},
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ])
        ]);

        // ... (The rest of the data formatting logic remains the same)
        const chartData = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        // ...
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthName = monthNames[date.getMonth()];
            
            const sale = salesData.find(s => s._id.year === year && s._id.month === month);
            const purchase = purchasesData.find(p => p._id.year === year && p._id.month === month);

            chartData.push({
                name: monthName,
                sales: sale?.total || 0,
                purchases: purchase?.total || 0,
            });
        }

        res.status(200).json({ success: true, data: chartData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};