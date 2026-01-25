import express from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { 
    getUser, 
    login, 
    logout, 
    register, 
    updateProfile 
} from '../controllers/userController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', AuthMiddleware, logout);
router.get('/profile', AuthMiddleware, getUser);
router.put('/profile', AuthMiddleware, updateProfile);

export default router;