import express from "express";
import { createSession, deleteSession, getSession, getSessionById, updateSession } from "../controllers/sessionController.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const sessionRouter = express.Router()

sessionRouter.route('/createSession').post(AuthMiddleware, createSession);
sessionRouter.route('/getSession').get(AuthMiddleware, getSession);
sessionRouter.route('/getSessionById/:id').get(AuthMiddleware, getSessionById);
sessionRouter.route('/updateSessioById/:id').put(AuthMiddleware, updateSession);
sessionRouter.route('/deleteSessionById/:id').delete(AuthMiddleware, deleteSession);

export default sessionRouter