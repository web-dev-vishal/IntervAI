import { configDotenv } from "dotenv";
import express from "express";

configDotenv({});
const app = express();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});