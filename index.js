const dotenv = require('dotenv');
const http = require('http'); 
const { Server } = require("socket.io"); 
const app = require('./app'); 
const connectDB = require('./config/db');
const { initScheduledJobs } = require('./services/scheduler');

dotenv.config();

connectDB();

const PORT = process.env.PORT || 6060;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000"], 
        methods: ["GET", "POST"]
    }
});

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


module.exports = { server, io };