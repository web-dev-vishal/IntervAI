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

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', AuthMiddleware, logout);
router.get('/profile', AuthMiddleware, getUser);
router.put('/profile', AuthMiddleware, updateProfile);

//exporting rotes 
export default router;