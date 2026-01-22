export const createSession = async (req, res) => {
    try {
        const { role, exprience, topicsToFocus } = req.body;
        const userId = req.id
        if (!role || !exprience || !topicsToFocus) {
            return res.status(401).json({
                message: "Please Provide all the details"
            })
        }

        const session = await Session.create({
            user: userId,
            role,
            exprience,
            topicsToFocus
        })

        await session.save()

        return res.status(201).json({
            message: "Session created successfully"
        })
    } catch (error) {
        res.status(500).json({ message: "Error in Create Session", error: err.message });
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

    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {

        res.status(500).json({ message: "Error Delete Session", error: err.message });
    }
};