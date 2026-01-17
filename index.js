import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./config/db.js"

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    connectDB();
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 INTERVAI API is ready!`);
});
