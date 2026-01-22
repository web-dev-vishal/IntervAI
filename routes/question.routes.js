import express from "express";
import { generateInterviewQuestion, togglePinQuestion } from "../controllers/questionController.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const questionRoute = express.Router();

questionRoute.route('/addQuestion').post(AuthMiddleware, generateInterviewQuestion);
questionRoute.route('/toggleQuestion/:id').post(AuthMiddleware,togglePinQuestion);

export default questionRoute;