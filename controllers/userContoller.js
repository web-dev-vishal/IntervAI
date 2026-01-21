import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs"; 
import jwt from 'jsonwebtoken';
import imagekit from "../config/imagekit.js";

export const register = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        // Validation
        if (!fullname || !email || !password) {
            return res.status(400).json({ 
                message: "Please provide all the fields", 
                success: false
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please provide a valid email address",
                success: false
            });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long",
                success: false
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ 
                message: "User already registered with this email",
                success: false
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12); 

        // Create user
        const newUser = await User.create({
            fullname,
            email,
            password: hashedPassword
        });

        return res.status(201).json({ 
            message: "User registered successfully", 
            success: true,
            user: {
                id: newUser._id,
                fullname: newUser.fullname,
                email: newUser.email
            }
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ 
            message: "Error registering user", 
            success: false,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                message: "Please provide all the fields", 
                success: false
            });
        }

        // Find user and explicitly select password
        const user = await User.findOne({ email }).select('+password'); 

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials",
                success: false
            });
        }

        // Compare passwords
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Invalid credentials",
                success: false
            });
        }

        // Generate JWT token with expiration
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict', 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        };

        // Remove password from user object
        const userResponse = {
            id: user._id,
            fullname: user.fullname,
            email: user.email,
            profilePhoto: user.profilePhoto
        };

        return res.cookie('token', token, cookieOptions).json({
            message: `${user.fullname} logged in successfully`,
            success: true,
            user: userResponse 
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            message: "Error logging in user", 
            success: false,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const logout = async (req, res) => {
    try {
        return res.cookie("token", "", { 
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        }).json({ 
            message: "User logged out successfully",
            success: true
        });

    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ 
            message: "Error logging out user", 
            success: false,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const getUser = async (req, res) => {
    try {
        const userId = req.id;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized - User ID not found",
                success: false
            });
        }

        const user = await User.findById(userId).select('-password'); 

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        return res.status(200).json({ 
            success: true,
            user
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            message: "Error fetching user", 
            success: false,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { fullname } = req.body || {};
        const profilePicture = req.file;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized - User ID not found",
                success: false
            });
        }

        // Prepare update object
        const updateData = {};
        if (fullname) {
            // Validate fullname length
            if (fullname.length < 2 || fullname.length > 100) {
                return res.status(400).json({
                    message: "Fullname must be between 2 and 100 characters",
                    success: false
                });
            }
            updateData.fullname = fullname;
        }

        // Update user
        const user = await User.findByIdAndUpdate(
            userId, 
            updateData, 
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // Handle profile picture upload
        if (profilePicture) {
            try {
                const result = await imagekit.upload({
                    file: profilePicture.buffer,
                    fileName: `${userId}_${Date.now()}_${profilePicture.originalname}` 
                });
                
                user.profilePhoto = result.url; 
                await user.save();

            } catch (uploadError) {
                console.error('ImageKit upload error:', uploadError);
                return res.status(500).json({
                    message: "Error uploading profile picture",
                    success: false,
                    error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
                });
            }
        }

        return res.status(200).json({ 
            message: "Profile updated successfully",
            success: true,
            user
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            message: "Error updating profile", 
            success: false,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};