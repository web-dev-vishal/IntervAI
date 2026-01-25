import jwt from 'jsonwebtoken';

export const AuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        req.id = decoded.userId;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Token expired. Please login again"
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        console.error('[AuthMiddleware]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};