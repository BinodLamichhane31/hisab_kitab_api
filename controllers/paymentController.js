const crypto = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Payment = require('../models/Payment');


exports.initiateSubscriptionPayment = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user.subscription.plan === 'PRO') {
            return res.status(400).json({ success: false, message: "You are already on the Pro plan." });
        }

        const transactionUUID = uuidv4();
        const productCode = "HISAB_KITAB_PRO_1Y";
        const amount = 1000; 
        
        await Payment.create({
            user: user._id,
            transactionUUID,
            productCode,
            amount,
        });

        const signatureString = `total_amount=${amount},transaction_uuid=${transactionUUID},product_code=${productCode}`;
        const signature = crypto.HmacSHA256(signatureString, process.env.ESEWA_MERCHANT_SECRET).toString(crypto.enc.Base64);
        
        res.status(200).json({
            success: true,
            message: "Payment initiation details generated.",
            paymentDetails: {
                amount: amount.toString(),
                tax_amount: "0",
                total_amount: amount.toString(),
                transaction_uuid: transactionUUID,
                product_code: productCode,
                product_service_charge: "0",
                product_delivery_charge: "0",
                success_url: `${process.env.CLIENT_WEB_URL}/payment/success`, 
                failure_url: `${process.env.CLIENT_WEB_URL}/payment/failure`, 
                signed_field_names: "total_amount,transaction_uuid,product_code",
                signature: signature,
                merchant_code: process.env.ESEWA_MERCHANT_CODE, 
                payment_url: process.env.ESEWA_WEB_API_URL, 
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};


exports.verifySubscriptionPayment = async (req, res) => {
    try {
        const { esewaData } = req.body; 

        if (!esewaData || !esewaData.transaction_code) {
            return res.status(400).json({ success: false, message: 'Verification data is missing or invalid.' });
        }
        
        let decodedData;
        if (typeof esewaData === 'string') {
            decodedData = JSON.parse(Buffer.from(esewaData, 'base64').toString('utf-8'));
        } else {
            decodedData = esewaData; 
        }
        
        if (decodedData.status !== "COMPLETE") {
            return res.status(400).json({ success: false, message: 'Payment was not completed.' });
        }

        const paymentRecord = await Payment.findOne({ transactionUUID: decodedData.transaction_uuid });
        if (!paymentRecord || paymentRecord.status !== 'PENDING') {
            return res.status(404).json({ success: false, message: 'Invalid or already processed transaction.' });
        }

        const signatureString = `transaction_code=${decodedData.transaction_code},status=${decodedData.status},total_amount=${decodedData.total_amount},transaction_uuid=${decodedData.transaction_uuid},product_code=${decodedData.product_code},signed_field_names=${decodedData.signed_field_names}`;
        const generatedSignature = crypto.HmacSHA256(signatureString, process.env.ESEWA_MERCHANT_SECRET).toString(crypto.enc.Base64);

        if (generatedSignature !== decodedData.signature) {
             return res.status(400).json({ success: false, message: 'Payment verification failed. Signature mismatch.' });
        }

        const user = await User.findById(paymentRecord.user);
        user.subscription.plan = 'PRO';
        user.subscription.status = 'ACTIVE';
        user.subscription.expiresAt = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
        await user.save();

        paymentRecord.status = 'COMPLETE';
        paymentRecord.esewaTransactionCode = decodedData.transaction_code;
        await paymentRecord.save();
        
        res.status(200).json({
            success: true,
            message: 'Congratulations! Your account has been upgraded to the Pro plan.',
        });

    } catch (error) {
         res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};