//import express  
import express from 'express';

//import Middlewares
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

//import all Contollers
import { 
    getUser, 
    login, 
    logout, 
    register, 
    updateProfile,
    forgotPassword,
    verifyOTP,
    resetPassword
} from '../controllers/userController.js';

//adding routes
const router = express.Router();

router.post('/register', authLimiter, register); //register User
router.post('/login', authLimiter, login); //login User
router.post('/logout', AuthMiddleware, logout); //logout User
router.get('/profile', AuthMiddleware, getUser); //Get User
router.put('/profile', AuthMiddleware, updateProfile); //Update User

// Password Reset Routes
router.post('/forgot-password', authLimiter, forgotPassword); //Request OTP
router.post('/verify-otp', authLimiter, verifyOTP); //Verify OTP
router.post('/reset-password', authLimiter, resetPassword); //Reset Password

//exporting rotes 
export default router;