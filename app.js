const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();   
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
const logRoutes = require("./routes/admin/systemLogRoutes");
const shopRoutes = require("./routes/shopRoutes");
const customerRoutes = require("./routes/customerRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const productRoutes = require("./routes/productRoutes");
const saleRoutes = require("./routes/saleRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const cashRoutes = require("./routes/cashRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const botRoutes = require("./routes/botRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
};
app.use(cors(corsOptions));

app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use("/api/uploads", express.static(path.join(__dirname, 'uploads')));

app.use("/api/auth", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", logRoutes); 
app.use("/api/shops", shopRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/payments", paymentRoutes);

module.exports = app;