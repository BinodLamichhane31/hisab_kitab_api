const { default: mongoose } = require("mongoose");
const Shop = require("../models/Shop");

exports.verifyShopOwner = async (shopId, userId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        return { error: 'Shop not found.', status: 404 };
    }
    if (shop.owner.toString() !== userId.toString()) {
        return { error: 'You are not authorized person for this shop.', status: 403 };
    }
    return { shop };
};