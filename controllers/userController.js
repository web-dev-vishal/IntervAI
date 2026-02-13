import { User } from "../models/user.model.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OTPService } from '../services/otpService.js';
import { EmailService } from '../services/emailService.js';

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

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Check rate limit (3 requests per hour per email)
        const attempts = await OTPService.trackOTPRequest(email);
        const maxAttempts = parseInt(process.env.OTP_RATE_LIMIT_MAX) || 3;
        
        if (attempts > maxAttempts) {
            return res.status(429).json({
                success: false,
                message: "Too many OTP requests. Please try again in 1 hour"
            });
        }

        // Check if user exists
        const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
        
        // Always return success to prevent email enumeration
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If the email exists, an OTP has been sent"
            });
        }

        // Generate OTP
        const otp = OTPService.generateOTP();
        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;

        // Store OTP in Redis
        await OTPService.storeOTP(email, otp, expiryMinutes);

        // Send OTP email
        try {
            await EmailService.sendOTPEmail(email, otp, user.fullname);
        } catch (emailError) {
            console.error('[forgotPassword] Email send failed:', emailError);
            // Delete OTP if email fails
            await OTPService.deleteOTP(email);
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Please try again"
            });
        }

        console.log(`[forgotPassword] OTP sent to ${email}, attempts: ${attempts}/${maxAttempts}`);

        return res.status(200).json({
            success: true,
            message: "If the email exists, an OTP has been sent",
            data: {
                expiresIn: `${expiryMinutes} minutes`
            }
        });
    } catch (error) {
        console.error('[forgotPassword]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Track verification attempts
        const verifyAttempts = await OTPService.trackOTPVerification(email);
        const maxVerifyAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;

        if (verifyAttempts > maxVerifyAttempts) {
            // Delete OTP after max attempts
            await OTPService.deleteOTP(email);
            return res.status(429).json({
                success: false,
                message: "Too many verification attempts. Please request a new OTP"
            });
        }

        // Verify OTP
        const isValid = await OTPService.verifyOTP(email, otp);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
                data: {
                    attemptsRemaining: maxVerifyAttempts - verifyAttempts
                }
            });
        }

        // Get remaining TTL
        const ttl = await OTPService.getOTPTTL(email);

        console.log(`[verifyOTP] OTP verified for ${email}`);

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            data: {
                expiresIn: ttl > 0 ? `${Math.floor(ttl / 60)} minutes` : 'soon'
            }
        });
    } catch (error) {
        console.error('[verifyOTP]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP, and new password are required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Validate password strength
        const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 6;
        if (newPassword.length < minLength) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${minLength} characters`
            });
        }

        // Verify OTP one final time
        const isValid = await OTPService.verifyOTP(email, otp);

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

        if (!user) {
            // Delete OTP even if user not found
            await OTPService.deleteOTP(email);
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if new password is same as old password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: "New password cannot be the same as old password"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await User.findByIdAndUpdate(user._id, { 
            password: hashedPassword 
        });

        // Delete OTP after successful reset
        await OTPService.deleteOTP(email);

        // Send confirmation email (don't wait for it)
        EmailService.sendPasswordChangeConfirmation(email, user.fullname).catch(err => {
            console.error('[resetPassword] Confirmation email failed:', err);
        });

        console.log(`[resetPassword] Password reset successful for ${email}`);

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now login with your new password"
        });
    } catch (error) {
        console.error('[resetPassword]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};