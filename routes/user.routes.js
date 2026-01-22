import express from 'express'
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { getUser, Login, logOut, register, updateProfile } from '../controllers/userController.js';
const userRouter = express.Router();

userRouter.route('/register').post(register);
userRouter.route('/getUser').get(AuthMiddleware, getUser);
userRouter.route('/login').post(Login);
userRouter.route('/logout').post(AuthMiddleware, logOut);
userRouter.route('/updateProfile').post(AuthMiddleware, updateProfile);

export default userRouter;