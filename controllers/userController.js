import { User } from "../models/user.model.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        if (!fullname || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "fullname, email, and password required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase().trim() }).lean();
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            fullname: fullname.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully"
        });
    } catch (error) {
        console.error('[register]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "email and password required"
            });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        if (!user.password) {
            return res.status(500).json({
                success: false,
                message: "Account error. Contact support"
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const userResponse = user.toObject();
        delete userResponse.password;

        return res
            .cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json({
                success: true,
                message: `Welcome back, ${user.fullname}`,
                data: { user: userResponse }
            });
    } catch (error) {
        console.error('[login]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const logout = (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error('[logout]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getUser = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId).lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            data: { user }
        });
    } catch (error) {
        console.error('[getUser]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { fullname } = req.body;

        if (!fullname || fullname.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "fullname required"
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { fullname: fullname.trim() },
            { new: true, runValidators: true }
        ).lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: { user }
        });
    } catch (error) {
        console.error('[updateProfile]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};