const { mongoose } = require("mongoose");
require("dotenv").config()
const CONNECTION_STRING = process.env.MONGO_URI

const connectDB = async() =>{
    try {
        await mongoose.connect(
            CONNECTION_STRING
        )
        console.log("Mongo db connected.")
    } catch (error) {
        console.log("MongoDB error")
        
    }
}
module.exports = connectDB