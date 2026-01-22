import express from "express";
import { generateInterviewQuestion, togglePinQuestion } from "../controllers/questionController.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const questionRoute = express.Router();

// ✅ Generate interview questions using AI
// POST /api/questions/generate
questionRoute.post('/generate', AuthMiddleware, generateInterviewQuestion);

// ✅ Toggle pin status of a question
// POST /api/questions/:id/toggle-pin
questionRoute.post('/toggle-pin/:id', AuthMiddleware, togglePinQuestion);

export default questionRoute;