// create
// req body (name, phone, address, shopId)
// user id form req.user
// missing fields check
// verification: logged in user owns the shop
// duplicate customer (by phone)
// create customer or save customer

const { date } = require("yup");
const Customer = require("../models/Customer");
const Shop = require("../models/Shop");
const { log } = require("winston");

exports.addCustomer = async (req, res) =>{
    try {
        const {name, phone, address, shopId} = req.body
        const userId = req.user._id

        if(!name || !phone || !shopId ){
            return res.status(400).json({
                success: false,
                message: "Customer name, phone and shops are required."
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
                message: "You are not authorized to add customer to this shop."
            })
        }

        const existingCustomer = await Customer.findOne({phone,shop:shopId})
        if(existingCustomer){
            return res.status(409).json({
                success: false,
                message: "Customer with this phone is already registered in this shop."
            })
        }

        const newCustomer = await Customer({
            name,
            phone,
            address,
            shop: shopId
        })
        await newCustomer.save()

        return res.status(201).json({
            success: true,
            message: "Customer added successfully"
        })        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error."+ error
        })
        
    }
}

exports.getCustomersByShop = async(req, res) =>{
    // req.query page, limit, search, shopId
    // user id form req.user
    // check id shopId is provided or not in the query
    // find shop by id
    // verify is shop is owned by user or not
    // sorting, searching and paginations 
    // respond with data
    try {
        const {page =1, limit = 10, search = "", shopId} = req.query
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
                message: "Not authorized to view this customers of this shop."
            })
        }
        const skip = (page -1) *limit
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

        const totalCustomers = await Customer.countDocuments(searchQuery)

        const customers = await Customer.find(searchQuery)
            .sort(sortBy)
            .skip(skip)
            .limit(Number(limit))
        
        return res.status(200).json({
            success: true,
            message: "Customers fetched",
            data: customers,
            pagination: {
                totalCustomers,
                currentPage: Number(page),
                totalPages: Math.ceil(totalCustomers/limit),
                limit: Number(limit)
            }
    });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internl server error."
        })
        
    }     
}

exports.getCustomerById = async(req,res) =>{
    try {
        const {customerId} = req.params
        const userId = req.user._id

        const customer = await Customer.findById(customerId)

        if(!customer){
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            })
        }

        const shop = await Shop.findById(customer.shop)
        if(!shop || shop.owner.toString() !== userId.toString()){
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this customer."
            })
        }
        return res.status(200).json({
            success: true,
            message: "Customer data fetched.",
            data: customer
        })
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        })
    }
}

exports.updateCustomer = async(req, res) =>{
    try {
        const {customerId} = req.params
        const {name, phone, address} = req.body
        const userId = req.user._id

        const customer = await Customer.findById(customerId)
        if(!customer){
            return res.status(404).json({
                success: false,
                message: "Customer Not Found"
            })
        }

        const shop = await Shop.findById(customer.shop);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Associated shop not found"
            });
        }

        if (shop.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this customer"
            });
        } 

        const updatedCustomer = await Customer.findByIdAndUpdate(
            customerId,
            {$set: {name, phone, address}},
            {new: true, runValidators:true}
        )

        return res.status(200).json({
            success: true,
            message: "Customer updated.",
            data: updatedCustomer
        })
        
    } catch (error) {
        console.log(error);
        
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        })
        
    }
}


exports.deleteCustomer = async (req, res) => {
    try {
        const {customerId} = req.params
        const userId = req.user._id
        

        const customer = await Customer.findById(customerId)
        if(!customer){
            return res.status(404).json({
                success: false,
                message: "Customer Not Found"
            })
        }

        const shop = await Shop.findById(customer.shop);
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: "Associated shop not found"
            });
        }

        if (shop.owner.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this customer"
            });
        } 
        // Data Integrity
        // Transaction to be counted. if transaction of the customer is more than 1, prevent deletion

        await Customer.findByIdAndDelete(customerId);
        return res.status(200).json({
            success: true,
            message: "Customer deleted."
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error."
        })
    }
}




