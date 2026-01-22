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
        const userId = req.id
        const session = await Session.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate("questions")

        res.status(201).json({
            session
        })

    } catch (err) {
        res.status(500).json({ message: "Error in Get Session", error: err.message });
    }
};

export const getSessionById = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .sort({ createdAt: -1 })
            .populate({
                path: "questions",
                options: { sort: { isPinned: -1 }, createdAt: -1 }
            })

        return res.status(201).json({
            session
        })
    } catch (err) {
        res.status(500).json({ message: "Error in Get Session By Id", error: err.message });

    }
};

export const deleteSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)

        if (!session) {
            return res.status(401).json({
                message: "Session not found"
            })
        }

        await Question.deleteMany({ session: session._id })

        await session.deleteOne()

        return res.status(201).json({
            message: "Session deleted successfully"
        })
    } catch (err) {
        res.status(500).json({ message: "Error Delete Session", error: err.message });
    }
};