const { log } = require("winston");
const Shop = require("../models/Shop");
const User = require("../models/User");


exports.createShop = async (req, res) =>{
    try {      
        const {name, address, contactNumber} = req.body
        const userId = req.user._id
        if(!name){
            return res.status(400).json({
                success: false,
                message: "Shop name is required."
            })
        }

        const user = await User.findById(userId).populate('shops');
        const currentShopCount = user.shops.length;
        const userPlan = user.subscription.plan;
        if (userPlan === 'FREE' && currentShopCount >= 2) {
            return res.status(403).json({
                success: false,
                message: "You have reached the 2-shop limit for the Free plan. Please upgrade to Pro to add more shops."
            });
        }

        const newShop = await Shop({
            name,
            address,
            contactNumber,
            owner: userId
        })

        await newShop.save();

       user.shops.push(newShop._id);
       await user.save()

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

exports.getShopById = async (req, res) => {
  try {
    const { id } = req.params;

    const shop = await Shop.findById(id).populate({
      path: 'owner',
      select: 'fname lname email'
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const shopOwnerId = shop.owner._id ? shop.owner._id.toString() : shop.owner.toString();
    if (shopOwnerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shop data fetched.",
      data: shop
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};

exports.updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;


    const shop = await Shop.findById(id).populate({
      path: 'owner',
      select: 'fname lname email'
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const shopOwnerId = shop.owner._id ? shop.owner._id.toString() : shop.owner.toString();
    if (shopOwnerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    Object.assign(shop, updates);
    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Shop updated.",
      data: shop
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};

exports.deleteShop = async (req, res) => {
  try {
    const { id } = req.params;

    const shop = await Shop.findById(id).populate({
      path: 'owner',
      select: 'fname lname email'
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    const shopOwnerId = shop.owner._id ? shop.owner._id.toString() : shop.owner.toString();
    if (shopOwnerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    await shop.deleteOne()

    await User.findByIdAndUpdate(req.user._id, { $pull: { shops: shop._id } });

    return res.status(200).json({
      success: true,
      message: "Shop deleted.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error: " + error.message,
    });
  }
};


