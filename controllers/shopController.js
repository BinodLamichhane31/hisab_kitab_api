const Shop = require("../models/Shop");
const User = require("../models/User");


exports.createShop = async (req, res) =>{
    try {
        const {name, address, contactNumber} = req.body
        if(!name){
            return res.status(400).json({
                success: false,
                message: "Shop name is required."
            })
        }

        const newShop = await Shop({
            name,
            address,
            contactNumber,
            owner: req.user._id
        })

        await newShop.save();

        await User.findByIdAndUpdate(req.user._id,{$push: {shops:newShop._id}})

        return res.status(201).json({
            success:true,
            message: "New shop added.",
            data: newShop
        })
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        })
        
    }

}

exports.getShops = async (req,res) => {
    try {
        const shops = await Shop.find({owner:req.user._id}).populate({
            path:"owner",
            select:"fname lname email"
        })
        if(!shops){
            return res.status(404).json(
                {
                    success:false,
                    message:"Shops not found.",
                }
            )
        }
        return res.status(200).json(
            {
                success:true,
                message:"Shops data fetched.",
                data: shops
            }
        )

        
    } catch (error) {
        return res.status(500).json(
            {
                success:false,
                message:"Internal server error.",
            }
        )
        
    }

}