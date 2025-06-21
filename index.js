const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require("./routes/userRoutes")
const adminRoutes = require("./routes/admin/adminRoutes")
const logRoutes = require("./routes/admin/systemLogRoutes")
const shopRoutes = require("./routes/shopRoutes")
const helmet = require('helmet')
const cors = require('cors');
const cookieParser = require('cookie-parser');


dotenv.config();
const PORT = process.env.PORT || 6060;

const app = express();
app.use(helmet())

connectDB();

let corsOptions = {
    origin : 'http://localhost:5173',
    credentials:true
 }
 
app.use(cors(corsOptions))
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth",userRoutes)
app.use("/api/admin",adminRoutes)
app.use("/api/admin",logRoutes)
app.use("/api/shops",shopRoutes)

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

