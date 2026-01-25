//import express  
import express from 'express';

//import Middleware
import { AuthMiddleware } from '../middlewares/auth.middleware.js';

import { authLimiter } from '../middlewares/rateLimiter.js';

//import Contoller
import { 
    getUser, 
    login, 
    logout, 
    register, 
    updateProfile 
} from '../controllers/userController.js';

//adding routes
const router = express.Router();

router.post('/register', authLimiter, register); //register User
router.post('/login', authLimiter, login); //login User
router.post('/logout', AuthMiddleware, logout); //logout User
router.get('/profile', AuthMiddleware, getUser); //Get User
router.put('/profile', AuthMiddleware, updateProfile); //Update User

//exporting rotes 
export default router;