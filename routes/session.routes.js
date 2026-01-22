import express from "express";
import { createSession, deleteSession, getSession, getSessionById } from "../controllers/sessionController.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const sessionRouter = express.Router()

sessionRouter.route('/createSession').post(AuthMiddleware, createSession);
sessionRouter.route('/getSession').get(AuthMiddleware, getSession);
sessionRouter.route('/getSessionById').get(AuthMiddleware, getSessionById);
sessionRouter.route('/deleteSession').delete(AuthMiddleware, deleteSession);

export default sessionRouter