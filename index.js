const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require("./routes/userRoutes")
const helmet = require('helmet')



dotenv.config();

const app = express();
app.use(helmet())
const PORT = process.env.PORT || 6060;

connectDB();

const cors = require('cors');
let corsOptions = {
    origin : '*',
 }
 
 app.use(cors(corsOptions))

app.use(express.json());

app.use("/api/auth",userRoutes)

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

