const Product = require('../models/Product');
const Shop = require('../models/Shop');
const path = require('path');
const fs = require("fs");


const verifyShopOwner = async (shopId, userId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) {
        return { error: 'Shop not found.', status: 404 };
    }
    if (shop.owner.toString() !== userId.toString()) {
        return { error: 'You are not authorized to manage products for this shop.', status: 403 };
    }
    return { shop };
};

exports.addProduct = async (req, res) => {
    try {
        
        const { name, sellingPrice, purchasePrice, quantity, category, description, reorderLevel, shopId } = req.body;
        const userId = req.user._id;

        const { error, status, shop } = await verifyShopOwner(shopId, userId);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        const newProduct = new Product({
            name,
            sellingPrice,
            purchasePrice,
            quantity,
            category,
            description,
            reorderLevel,
            shopId: shopId,
        });

         if (req.file) {
            newProduct.image = `/uploads/${req.file.filename}`;
        }

        await newProduct.save();

        res.status(201).json({
            success: true,
            message: 'Product added successfully.',
            data: newProduct,
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

exports.getProductsByShop = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", shopId } = req.query;
        const userId = req.user._id;

        const { error, status } = await verifyShopOwner(shopId, userId);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        const skip = (page - 1) * limit;
        const searchQuery = {
            shopId: shopId,
            name: { $regex: search, $options: 'i' },
        };

        const totalProducts = await Product.countDocuments(searchQuery);
        const products = await Product.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            data: products,
            pagination: {
                totalProducts,
                currentPage: Number(page),
                totalPages: Math.ceil(totalProducts / limit),
            },
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const { error, status } = await verifyShopOwner(product.shopId, req.user._id);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        res.status(200).json({ success: true, data: product });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const updates = req.body;
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const { error, status } = await verifyShopOwner(product.shopId, req.user._id);
        if (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(status).json({ success: false, message: error });
        }
        delete updates._id; 
        delete updates.shopId;

        if (req.file) {
            if (product.image) {
                const oldImagePath = path.join(__dirname, '..', product.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            updates.image = `/uploads/${req.file.filename}`;
        }

        const updatedProduct = await Product.findByIdAndUpdate(productId, { $set: updates }, { new: true, runValidators: true });

        res.status(200).json({
            success: true,
            message: 'Product updated successfully.',
            data: updatedProduct,
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const { error, status } = await verifyShopOwner(product.shopId, req.user._id);
        if (error) {
            return res.status(status).json({ success: false, message: error });
        }

        
        

        if (product.image) {
            const imagePath = path.join(__dirname, '..', product.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await Product.findByIdAndDelete(productId);

        res.status(200).json({ success: true, message: 'Product deleted successfully.' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};