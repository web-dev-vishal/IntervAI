import { Question } from "../models/question.model.js";
import { Session } from "../models/session.model.js";

export const createSession = async (req, res) => {
    try {
        const { role, experience, topicsToFocus } = req.body;
        const userId = req.id;
        
        if (!role || !experience || !topicsToFocus) {
            return res.status(400).json({
                message: "Please provide all the details",
                success: false
            });
        }

        if (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0) {
            return res.status(400).json({
                message: "Please provide at least one topic to focus",
                success: false
            });
        }

        const validRoles = ['interviewer', 'interviewee', 'mock-interview', 'practice', 'Backend Developer', 'Frontend Developer'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role. Allowed values: ${validRoles.join(', ')}`,
                success: false
            });
        }

        const validExperience = ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'expert'];
        if (!validExperience.includes(experience)) {
            return res.status(400).json({
                message: `Invalid experience level. Allowed values: ${validExperience.join(', ')}`,
                success: false
            });
        }

        const session = await Session.create({
            user: userId,
            role,
            experience,
            topicsToFocus
        });

        return res.status(201).json({
            message: "Session created successfully",
            success: true,
            session
        });
    } catch (err) {
        console.log(`Error in Create Session: ${err.message}`);
        return res.status(500).json({ 
            message: "Error in Create Session", 
            error: err.message,
            success: false
        });
    }
};

export const getSession = async (req, res) => {
    try {
        const userId = req.id;
        
        const sessions = await Session.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate("questions");

        return res.status(200).json({
            success: true,
            count: sessions.length,
            sessions
        });

    } catch (err) {
        console.log(`Error in Get Session: ${err.message}`);
        return res.status(500).json({ 
            message: "Error in Get Session", 
            error: err.message,
            success: false
        });
    }
};

export const getSessionById = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate({
                path: "questions",
                options: { 
                    sort: { isPinned: -1, createdAt: -1 }
                }
            });

        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to access this session",
                success: false
            });
        }

        return res.status(200).json({
            success: true,
            session
        });
        
    } catch (err) {
        console.log(`Error in Get Session By Id: ${err.message}`);
        return res.status(500).json({ 
            message: "Error in Get Session By Id", 
            error: err.message,
            success: false
        });
    }
};

export const updateSession = async (req, res) => {
    try {
        const { role, experience, topicsToFocus, status, duration } = req.body;
        const sessionId = req.params.id;

        const session = await Session.findById(sessionId);

        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to update this session",
                success: false
            });
        }

        if (role) {
            const validRoles = ['interviewer', 'interviewee', 'mock-interview', 'practice', 'Backend Developer', 'Frontend Developer'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    message: `Invalid role. Allowed values: ${validRoles.join(', ')}`,
                    success: false
                });
            }
        }

        if (experience) {
            const validExperience = ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'expert'];
            if (!validExperience.includes(experience)) {
                return res.status(400).json({
                    message: `Invalid experience level. Allowed values: ${validExperience.join(', ')}`,
                    success: false
                });
            }
        }

        if (status) {
            const validStatus = ['pending', 'in-progress', 'completed', 'cancelled'];
            if (!validStatus.includes(status)) {
                return res.status(400).json({
                    message: `Invalid status. Allowed values: ${validStatus.join(', ')}`,
                    success: false
                });
            }
        }

        if (topicsToFocus) {
            if (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0) {
                return res.status(400).json({
                    message: "Please provide at least one topic to focus",
                    success: false
                });
            }
        }

        const updateData = {};
        if (role) updateData.role = role;
        if (experience) updateData.experience = experience;
        if (topicsToFocus) updateData.topicsToFocus = topicsToFocus;
        if (status) updateData.status = status;
        if (duration) updateData.duration = duration;

        const updatedSession = await Session.findByIdAndUpdate(
            sessionId,
            updateData,
            { new: true, runValidators: true }
        ).populate("questions");

        return res.status(200).json({
            message: "Session updated successfully",
            success: true,
            session: updatedSession
        });

    } catch (err) {
        console.log(`Error in Update Session: ${err.message}`);
        return res.status(500).json({
            message: "Error in Update Session",
            error: err.message,
            success: false
        });
    }
};

export const deleteSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to delete this session",
                success: false
            });
        }

        await Question.deleteMany({ session: session._id });

        await session.deleteOne();

        return res.status(200).json({
            message: "Session deleted successfully",
            success: true
        });
        
    } catch (err) {
        console.log(`Error Delete Session: ${err.message}`);
        return res.status(500).json({ 
            message: "Error Delete Session", 
            error: err.message,
            success: false
        });
    }
};