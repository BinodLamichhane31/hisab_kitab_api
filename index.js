const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require("./routes/userRoutes")
const adminRoutes = require("./routes/admin/adminRoutes")
const logRoutes = require("./routes/admin/systemLogRoutes")
const shopRoutes = require("./routes/shopRoutes")
const customerRoutes = require("./routes/customerRoutes")
const supplierRoutes = require("./routes/supplierRoutes")
const productRoutes = require("./routes/productRoutes")
const saleRoutes = require("./routes/saleRoutes")
const purchaseRoutes = require("./routes/purchaseRoutes")
const transactionRoutes = require("./routes/transactionRoutes")
const dashboardRoutes = require("./routes/dashboardRoutes")
const helmet = require('helmet')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const bodyParser = require('body-parser');


dotenv.config();
const PORT = process.env.PORT || 6060;

const app = express();
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, 
    crossOriginResourcePolicy: { policy: "cross-origin" }, 
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "http://localhost:6060", "http://localhost:5173"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:6060", "http://localhost:5173"],
      },
    },
  })
);

connectDB();

let corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:3000'], 
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
    optionsSuccessStatus: 200, 
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type']
}
 
app.use(cors(corsOptions))
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))
app.use("/uploads",express.static(path.join(__dirname,'uploads')))

app.use("/api/auth",userRoutes)
app.use("/api/admin",adminRoutes)
app.use("/api/admin",logRoutes)
app.use("/api/shops",shopRoutes)
app.use("/api/customers",customerRoutes)
app.use("/api/suppliers",supplierRoutes)
app.use("/api/products",productRoutes)
app.use("/api/sales",saleRoutes)
app.use("/api/purchases",purchaseRoutes)
app.use("/api/transactions",transactionRoutes)
app.use("/api/dashboard",dashboardRoutes)


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app

