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

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 11);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1, 0); 
        endDate.setHours(23, 59, 59, 999);
        
        const [salesData, purchasesData] = await Promise.all([
            Sale.aggregate([
                { $match: { shop: shopObjectId, status: 'COMPLETED', saleDate: { $gte: startDate, $lte: endDate } } },
                { $group: { 
                    _id: { year: { $year: "$saleDate" }, month: { $month: "$saleDate" } },
                    total: { $sum: "$grandTotal" } 
                }},
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]),
            Purchase.aggregate([
                { $match: { shop: shopObjectId, status: 'COMPLETED', purchaseDate: { $gte: startDate, $lte: endDate } } },
                { $group: {
                    _id: { year: { $year: "$purchaseDate" }, month: { $month: "$purchaseDate" } },
                    total: { $sum: "$grandTotal" }
                }},
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ])
        ]);

        const chartData = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        let currentDate = new Date(startDate);

        for (let i = 0; i < 12; i++) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // getMonth is 0-indexed
            const monthName = monthNames[currentDate.getMonth()];

            const sale = salesData.find(s => s._id.year === year && s._id.month === month);
            const purchase = purchasesData.find(p => p._id.year === year && p._id.month === month);

            chartData.push({
                name: `${monthName}`, 
                sales: sale?.total || 0,
                purchases: purchase?.total || 0,
            });
            
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        res.status(200).json({ success: true, data: chartData });

    } catch (error) {
        console.error('Chart Data Error:', error);
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};