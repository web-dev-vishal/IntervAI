export const createSession = async (req,res)=> {
    try {
        const {role, exprience, topicsToFocus} = req.body;
        const userId = req.id
        if(!role || !exprience || !topicsToFocus){
            return res.status(401).json({
                message:"Please Provide all the details"
            })
        }

        const session = await Session.create({
            user:userId,
            role,
            exprience,
            topicsToFocus
        })

        await session.save()

        return res.status(201).json({
            message:"Session created successfully"
        })
    } catch (error) {
        res.status(500).json({ message: "Error in Create Session", error: err.message });
    }
};

export const getSession = async (req,res)=> {

};

export const getSessionById = async (req,res)=> {

};

export const deleteSession = async (req,res)=> {

};