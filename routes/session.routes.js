import express from "express";
import { 
    createSession, 
    deleteSession, 
    getSession, 
    getSessionById, 
    updateSession 
} from "../controllers/sessionController.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post('/create', AuthMiddleware, createSession); //Create session
router.get('/', AuthMiddleware, getSession); //Get session 
router.get('/:id', AuthMiddleware, getSessionById); //Get session By Id
router.put('/:id', AuthMiddleware, updateSession); //Update session
router.delete('/:id', AuthMiddleware, deleteSession); //Delete session

export default router;