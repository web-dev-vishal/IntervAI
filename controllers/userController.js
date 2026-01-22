import { User } from "../models/User.model.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async(req, res) => {
    try {
        const {fullname, email, password} = req.body;

        if(!fullname || !email || !password){
            return res.status(401).json({
                message: "Please provide all the values",
                success: false
            });
        }

        const user = await User.findOne({email});

        if(user){
            return res.status(401).json({
                message: "User already registered",
                success: false
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        await User.create({
            fullname, 
            email,
            password: hashedPassword
        });

        return res.status(201).json({
            message: "User registered successfully",
            success: true
        });
    } catch (error) {
        res.status(500).json({ message: "Error registering user", error: err.message });
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};


export const Login = async(req, res) => {
    try {
        const {email, password} = req.body;
        
        if(!email || !password){
            return res.status(401).json({
                message: "Please provide all the values",
                success: false
            });
        }

        const user = await User.findOne({email});

        if(!user){
            return res.status(401).json({
                message: "Invalid credentials",
                success: false
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if(!isPasswordMatch){
            return res.status(401).json({
                message: "Invalid credentials",
                success: false
            });
        }

        const token = await jwt.sign({userId: user._id}, process.env.SECRET_KEY);
        
        return res.cookie('token', token, {httpOnly: true}).json({
            message: `${user.fullname} logged in successfully`,
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ message: "Error login user", error: err.message });
            return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};


export const logOut = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    });

    return res.status(200).json({
        success: true,
        message: "User logged out successfully",
    });
};


export const getUser = async(req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);
        
        if(!user){
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }
        
        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        res.status(500).json({ message: "Error get user", error: err.message });
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};


export const updateProfile = async(req, res) => {
    try {
        const userId = req.id;
        const {fullname} = req.body || {};
         
        if(!fullname){
            return res.status(400).json({
                message: "Please provide fullName to update",
                success: false
            });
        }

        const user = await User.findByIdAndUpdate(
            userId, 
            {fullname}, 
            {new: true, runValidators: true}
        );

        if(!user){
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ message: "Error Update user", error: err.message });
            return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};