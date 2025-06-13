const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require("./routes/userRoutes")
const helmet = require('helmet')
const cors = require('cors');

dotenv.config();
const PORT = process.env.PORT || 6060;

const app = express();
app.use(helmet())

connectDB();

let corsOptions = {
    origin : '*',
 }
 
app.use(cors(corsOptions))
app.use(express.json());

app.use("/api/auth",userRoutes)

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

