const { default: mongoose } = require("mongoose")

const shopSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        address: {
            type: String,
            trim: true,
            maxlength: 250
        },
        contactNumber: {
            type: String,
            trim: true,
        },
        owner: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model("Shop",shopSchema)