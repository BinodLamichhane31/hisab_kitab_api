const express = require('express');
const dotenv = require('dotenv');
const http = require('http'); 
const { Server } = require("socket.io"); 
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { initScheduledJobs } = require('./services/scheduler');
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

dotenv.config();
connectDB();
const app = express();
const PORT = process.env.PORT || 6060;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000"], 
        methods: ["GET", "POST"]
    }
});


app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
};
app.use(cors(corsOptions));

app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use("/uploads", express.static(path.join(__dirname, 'uploads')));

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
app.use("/api/payments", paymentRoutes);


const userSockets = new Map();
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoom', (userId) => {
        socket.join(userId);
        userSockets.set(userId, socket.id);
        console.log(`User with ID ${userId} joined room ${userId}`);
    });

    socket.on('disconnect', () => {
        for (let [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                break;
            }
        }
        console.log('User disconnected:', socket.id);
    });
});
 

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initScheduledJobs(io); 
});

module.exports = app;