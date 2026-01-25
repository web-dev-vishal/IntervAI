//import express  
import express from "express";

//import all Contollers
import { 
    createSession, 
    deleteSession, 
    getSession, 
    getSessionById, 
    updateSession 
} from "../controllers/sessionController.js";

//import Middleware
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

//adding routes
const router = express.Router();

router.post('/create', AuthMiddleware, createSession); //Create session
router.get('/', AuthMiddleware, getSession); //Get session 
router.get('/:id', AuthMiddleware, getSessionById); //Get session By Id
router.put('/:id', AuthMiddleware, updateSession); //Update session
router.delete('/:id', AuthMiddleware, deleteSession); //Delete session

//exporting rotes 
export default router;