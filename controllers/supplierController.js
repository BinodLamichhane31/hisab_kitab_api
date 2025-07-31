const Supplier = require("../models/Supplier");
const Shop = require("../models/Shop");
const Purchase = require("../models/Purchase");
const logger = require("../utils/logger");
const Transaction = require("../models/Transaction");

exports.addSupplier = async (req, res) =>{
    try {        
        const {name, phone, email,address, shop:shopId} = req.body
        const userId = req.user._id
        

        if(!name || !phone || !shopId || !email){
            return res.status(400).json({
                success: false,
                message: "Supplier name, phone, email and shop are required."
            })
        }

        const shop = await Shop.findById(shopId)

        if(!shop){
            return res.status(404).json({
                success: false,
                message: "Shop not found."
            })
        }

        if(shop.owner.toString() !== userId.toString()){
            return res.status(403).json({
                success: false,
                message: "You are not authorized to add supplier to this shop."
            })
        }

        const existingSupplier = await Supplier.findOne({phone,shop:shopId})
        if(existingSupplier){
            return res.status(409).json({
                success: false,
                message: "Supplier with this phone is already registered in this shop."
            })
        }

        const newSupplier = await Supplier({
            name,
            phone,
            email,
            address,
            shop: shopId
        })
        await newSupplier.save()

        return res.status(201).json({
            success: true,
            message: "Supplier added successfully"
        })        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error."+ error
        })
        
    }
}

exports.getSuppliersByShop = async(req, res) =>{
    try {
        const {search = "", shopId} = req.query
        const userId = req.user._id;

        if(!shopId){
            return res.status(400).json({
                success: false,
                message:"ShopId is not provided in the query parameter."
            })
        }

        const shop = await Shop.findById(shopId)
        if(!shop){
            return res.status(404).json({
                success: false,
                message: "Shop not found."
            })
        }
        if(shop.owner.toString() !== userId.toString()){
            return res.status(403).json({
                success: false, 
                message: "Not authorized to view this Suppliers of this shop."
            })
        }
        const sortField = req.query.sortField || 'createdAt'
        const sortOrder = req.query.sortOrder === 'asc' ? 1: -1;
        const sortBy = {[sortField]:sortOrder}

        const searchQuery = {
            shop: shopId,
            $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            ]
        };


        const suppliers = await Supplier.find(searchQuery)
            .sort(sortBy)
        
        return res.status(200).json({
            success: true,
            message: "Suppliers fetched",
            data: suppliers
    });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internl server error."
        })
        
    }     
}

exports.getSupplierById = async(req,res) =>{
    try {      
                  
        const {supplierId} = req.params
        const userId = req.user._id

        const supplier = await Supplier.findById(supplierId)

        if(!supplier){
            return res.status(404).json({
                success: false,
                message: "Supplier not found."
            })
        }

        const shop = await Shop.findById(supplier.shop)
        if(!shop || shop.owner.toString() !== userId.toString()){
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this supplier."
            })
        }
        return res.status(200).json({
            success: true,
            message: "Supplier data fetched.",
            data: supplier
        })
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        })
    }
}

exports.updateSupplier = async(req, res) =>{
    try {
        const {supplierId} = req.params
        const {name, phone, email,address} = req.body
        const userId = req.user._id

        const supplier = await Supplier.findById(supplierId)
        if(!supplier){
            return res.status(404).json({
                success: false,
                message: "Supplier Not Found"
            })
        }

        const shop = await Shop.findById(supplier.shop);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Associated shop not found"
            });
        }

        if (shop.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this Supplier"
            });
        } 

        const updatedSupplier = await Supplier.findByIdAndUpdate(
            supplierId,
            {$set: {name, phone,email ,address}},
            {new: true, runValidators:true}
        )

        return res.status(200).json({
            success: true,
            message: "Supplier updated.",
            data: updatedSupplier
        })
        
    } catch (error) {
        console.log(error);
        
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        })
        
    }
}


exports.deleteSupplier = async (req, res) => {
    try {
        const {supplierId} = req.params
        const userId = req.user._id
        

        const supplier = await Supplier.findById(supplierId)
        if(!supplier){
            return res.status(404).json({
                success: false,
                message: "Supplier Not Found"
            })
        }

        const shop = await Shop.findById(supplier.shop);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Associated shop not found"
            });
        }

        if (shop.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this Supplier"
            });
        } 
        // Data Integrity
        const transactionCount = await Transaction.countDocuments({ relatedSupplier: supplierId });

        if (transactionCount > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot delete supplier. This supplier has ${transactionCount} associated transaction(s).`,
          });
        }
        const purchaseCount = await Purchase.countDocuments({ supplier: supplierId });
        if (purchaseCount > 0) {
            return res.status(400).json({
              success: false,
              message: `Cannot delete supplier. This supplier has ${purchaseCount} associated sale(s).`,
            });
        }

        await Supplier.findByIdAndDelete(supplierId);
        return res.status(200).json({
            success: true,
            message: "Supplier deleted."
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error."
        })
    }
}




