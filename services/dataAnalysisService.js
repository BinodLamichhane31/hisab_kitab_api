const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Customer = require('../models/Customer');
const moment = require('moment');

exports.getFinancialSummaryForUser = async (userId, shopId) => {
    const startOfMonth = moment().startOf('month');

    const [salesThisMonth, purchasesThisMonth, topDebtors] = await Promise.all([
        Sale.aggregate([
            { $match: { shop: shopId, status: 'COMPLETED', saleDate: { $gte: startOfMonth.toDate() } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
        ]),
        Purchase.aggregate([
            { $match: { shop: shopId, status: 'COMPLETED', purchaseDate: { $gte: startOfMonth.toDate() } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
        ]),
        Customer.find({ shop: shopId, currentBalance: { $gt: 0 } })
            .sort({ currentBalance: -1 })
            .limit(3)
            .select('name currentBalance')
    ]);
    
    let summary = "This is the user's live financial data summary:\n";
    summary += `- This month's total sales: NPR ${salesThisMonth[0]?.total.toLocaleString() || 0} from ${salesThisMonth[0]?.count || 0} sales.\n`;
    summary += `- This month's total purchases: NPR ${purchasesThisMonth[0]?.total.toLocaleString() || 0} from ${purchasesThisMonth[0]?.count || 0} purchases.\n`;
    
    if (topDebtors.length > 0) {
        summary += `- Top customers with outstanding balance are: ${topDebtors.map(c => `${c.name} (NPR ${c.currentBalance.toLocaleString()})`).join(', ')}.\n`;
    } else {
        summary += "- No customers currently have an outstanding balance.\n";
    }

    return summary;
};