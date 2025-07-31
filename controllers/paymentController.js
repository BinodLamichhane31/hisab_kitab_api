const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Payment = require('../models/Payment');

exports.initiateSubscriptionPayment = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user.subscription.plan === 'PRO') {
            return res.status(400).json({ 
                success: false, 
                message: "You are already on the Pro plan." 
            });
        }

        const transactionUUID = uuidv4();
        const productCode = "HISAB_PRO";
        const amount = 10; 
        
        await Payment.create({
            user: user._id,
            transactionUUID,
            productCode,
            amount,
            status: 'PENDING'
        });

        const paymentDetails = {
            tAmt: amount.toString(),           // Total amount
            amt: amount.toString(),            // Amount
            txAmt: "0",                       // Tax amount
            psc: "0",                         // Product service charge
            pdc: "0",                         // Product delivery charge
            pid: transactionUUID,             // Product ID (use transaction UUID)
                        scd: process.env.ESEWA_MERCHANT_CODE,
            su: `${process.env.CLIENT_WEB_URL}/payment/success`,
            fu: `${process.env.CLIENT_WEB_URL}/payment/failure`,
            
            // Form action URL
            payment_url: `${process.env.ESEWA_WEB_API_URL}`
        };
        
        res.status(200).json({
            success: true,
            message: "Payment initiation details generated.",
            paymentDetails: paymentDetails
        });

    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error: ' + error.message 
        });
    }
};

exports.verifySubscriptionPayment = async (req, res) => {
    try {
        console.log(req.body);
        
        // eSewa sends data as query parameters in the success URL
        const { oid, amt, refId } = req.body;

        if (!oid || !refId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required payment verification data.' 
            });
        }

        const paymentRecord = await Payment.findOne({ 
            transactionUUID: oid,
            status: 'PENDING'
        });
        
        if (!paymentRecord) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid or already processed transaction.' 
            });
        }

        const verificationUrl = `https://rc.esewa.com.np/epay/transrec`;
        const verificationData = {
            amt: paymentRecord.amount,
            pid: oid,
            rid: refId,
            scd: process.env.ESEWA_MERCHANT_CODE
        };


        const user = await User.findById(paymentRecord.user);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        user.subscription.plan = 'PRO';
        user.subscription.status = 'ACTIVE';
        user.subscription.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        await user.save();

        paymentRecord.status = 'COMPLETE';
        paymentRecord.esewaTransactionCode = refId;
        await paymentRecord.save();
        
        console.log('Payment verification successful for user:', user._id);
        
        res.status(200).json({
            success: true,
            message: 'Congratulations! Your account has been upgraded to the Pro plan.',
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server Error: ' + error.message 
        });
    }
};