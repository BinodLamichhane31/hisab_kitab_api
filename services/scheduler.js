const cron = require('node-cron');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Notification = require('../models/Notification');

const createAndEmitNotification = async (io, notificationData) => {
    try {
        const existing = await Notification.findOne({
            user: notificationData.user,
            link: notificationData.link,
            type: notificationData.type,
            isRead: false,
        });

        if (!existing) {
            const newNotification = await Notification.create(notificationData);
            io.to(notificationData.user.toString()).emit('new_notification', newNotification);
            console.log(`Notification sent to user ${notificationData.user}: ${notificationData.message}`);
        }
    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

const checkLowStock = async (io) => {
    try {
        const lowStockProducts = await Product.find({ 
            $expr: { $lte: ["$quantity", "$reorderLevel"] } 
        }).populate({ path: 'shopId', select: 'owner' });
        
        for (const product of lowStockProducts) {
            if (product.shopId?.owner) {
                await createAndEmitNotification(io, {
                    shop: product.shopId._id,
                    user: product.shopId.owner,
                    type: 'LOW_STOCK',
                    message: `${product.name} is running low on stock (Current: ${product.quantity}).`,
                    link: `/products/${product._id}`
                });
            }
        }
    } catch (error) {
        console.error('Error in checkLowStock job:', error);
    }
};

const checkOverdueCollections = async (io) => {
    try {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const overdueSales = await Sale.find({
            status: 'COMPLETED',
            paymentStatus: { $in: ['UNPAID', 'PARTIAL'] },
            saleDate: { $lte: fifteenDaysAgo } 
        }).populate('shop customer');

        for (const sale of overdueSales) {
            if (sale.shop?.owner && sale.customer) {
                await createAndEmitNotification(io, {
                    shop: sale.shop._id,
                    user: sale.shop.owner,
                    type: 'COLLECTION_OVERDUE',
                    message: `Payment of Rs. ${sale.amountDue} from ${sale.customer.name} is overdue.`,
                    link: `/sales/${sale._id}`
                });
            }
        }
    } catch (error) {
        console.error('Error in checkOverdueCollections job:', error);
    }
};

const checkDuePayments = async (io) => {
    try {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const duePurchases = await Purchase.find({
            status: 'COMPLETED',
            paymentStatus: { $in: ['UNPAID', 'PARTIAL'] },
            purchaseDate: { $lte: fifteenDaysAgo } 
        }).populate('shop supplier');

        for (const purchase of duePurchases) {
            if (purchase.shop?.owner && purchase.supplier) {
                await createAndEmitNotification(io, {
                    shop: purchase.shop._id,
                    user: purchase.shop.owner,
                    type: 'PAYMENT_DUE',
                    message: `Payment of Rs. ${purchase.amountDue} to ${purchase.supplier.name} is due.`,
                    link: `/purchases/${purchase._id}`
                });
            }
        }
    } catch (error) {
        console.error('Error in checkDuePayments job:', error);
    }
};

exports.initScheduledJobs = (io) => {
    // For production, once a day at a specific time, e.g., 2 AM ('0 2 * * *')
    // For testing, every minute ('* * * * *')
    cron.schedule('* 6 * * *', () => {
        console.log("--- Running Daily Notification Checks ---");
        checkLowStock(io);
        checkOverdueCollections(io);
        checkDuePayments(io);
    }, {
        timezone: "Asia/Kathmandu"
    });

    console.log("Scheduled jobs for notifications have been initialized.");
};