import { Question } from "../models/question.model.js";
import { Session } from "../models/session.model.js";
import mongoose from "mongoose";

const VALID_ROLES = [
    'interviewer',
    'interviewee',
    'mock-interview',
    'practice',
    'Backend Developer',
    'Frontend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'Data Scientist'
];

const VALID_EXPERIENCE = ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'expert'];
const VALID_STATUS = ['pending', 'in-progress', 'completed', 'cancelled'];

export const createSession = async (req, res) => {
    try {
        const { role, experience, topicsToFocus } = req.body;
        const userId = req.id;
        
        if (!role || !experience || !topicsToFocus) {
            return res.status(400).json({
                success: false,
                message: "role, experience, and topicsToFocus required"
            });
        }

        if (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0) {
            return res.status(400).json({
                success: false,
                message: "topicsToFocus must be non-empty array"
            });
        }

        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}`
            });
        }

        if (!VALID_EXPERIENCE.includes(experience)) {
            return res.status(400).json({
                success: false,
                message: `Invalid experience. Allowed: ${VALID_EXPERIENCE.join(', ')}`
            });
        }

        const session = await Session.create({
            user: userId,
            role,
            experience,
            topicsToFocus
        });

        return res.status(201).json({
            success: true,
            message: "Session created successfully",
            data: { session }
        });
    } catch (error) {
        console.error('[createSession]', error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

export const getSession = async (req, res) => {
    try {
        const userId = req.id;
        
        const sessions = await Session.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate("questions")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Sessions retrieved successfully",
            count: sessions.length,
            data: { sessions }
        });

    } catch (error) {
        console.error('[getSession]', error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

export const getSessionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID"
            });
        }

        const session = await Session.findById(id)
            .populate({
                path: "questions",
                options: { 
                    sort: { isPinned: -1, createdAt: -1 }
                }
            });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Session retrieved successfully",
            data: { session }
        });
        
    } catch (error) {
        console.error('[getSessionById]', error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};

export const updateSession = async (req, res) => {
    try {
        const { role, experience, topicsToFocus, status, duration } = req.body;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID"
            });
        }

        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        if (role && !VALID_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}`
            });
        }

        if (experience && !VALID_EXPERIENCE.includes(experience)) {
            return res.status(400).json({
                success: false,
                message: `Invalid experience. Allowed: ${VALID_EXPERIENCE.join(', ')}`
            });
        }

        if (status && !VALID_STATUS.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed: ${VALID_STATUS.join(', ')}`
            });
        }

        if (topicsToFocus && (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0)) {
            return res.status(400).json({
                success: false,
                message: "topicsToFocus must be non-empty array"
            });
        }

        const updateData = {};
        if (role) updateData.role = role;
        if (experience) updateData.experience = experience;
        if (topicsToFocus) updateData.topicsToFocus = topicsToFocus;
        if (status) updateData.status = status;
        if (duration !== undefined) updateData.duration = duration;

        const updatedSession = await Session.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate("questions");

        return res.status(200).json({
            success: true,
            message: "Session updated successfully",
            data: { session: updatedSession }
        });

    } catch (error) {
        console.error('[updateSession]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID"
            });
        }

        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        await Question.deleteMany({ session: id });
        await Session.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Session deleted successfully"
        });
        
    } catch (error) {
        console.error('[deleteSession]', error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error"
        });
    }
};