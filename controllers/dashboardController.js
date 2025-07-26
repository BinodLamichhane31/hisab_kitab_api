const mongoose = require('mongoose'); 
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const { verifyShopOwner } = require('../utils/verifyShopOwner'); 


exports.getDashboardStats = async (req, res) => {
    try {
        const { shopId } = req.query;
        const userId = req.user._id;

        const { error, status } = await verifyShopOwner(shopId, userId);
        if (error) return res.status(status).json({ success: false, message: error });

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


exports.getChartData = async (req, res) => {
    try {
        const { shopId } = req.query;
        const userId = req.user._id;

        const { error, status } = await verifyShopOwner(shopId, userId);
        if (error) return res.status(status).json({ success: false, message: error });

        const shopObjectId = new mongoose.Types.ObjectId(shopId);

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const [salesData, purchasesData] = await Promise.all([
            Sale.aggregate([
                { $match: { shop: shopObjectId, status: 'COMPLETED', saleDate: { $gte: twelveMonthsAgo } } },
                { $group: { 
                    _id: { year: { $year: "$saleDate" }, month: { $month: "$saleDate" } },
                    total: { $sum: "$grandTotal" } 
                }},
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]),
            Purchase.aggregate([
                { $match: { shop: shopObjectId, status: 'COMPLETED', purchaseDate: { $gte: twelveMonthsAgo } } },
                { $group: {
                    _id: { year: { $year: "$purchaseDate" }, month: { $month: "$purchaseDate" } },
                    total: { $sum: "$grandTotal" }
                }},
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ])
        ]);

        const chartData = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
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