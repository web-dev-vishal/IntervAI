import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/user.routes.js";
import sessionRouter from "./routes/session.routes.js";
import questionRoute from "./routes/question.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));

app.use("/api/v1/user", userRouter);
app.use("/api/v1/session", sessionRouter);
app.use("/api/v1/question", questionRoute);

app.listen(PORT, () => {
    connectDB();
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 INTERVAI API is ready!`);
});
