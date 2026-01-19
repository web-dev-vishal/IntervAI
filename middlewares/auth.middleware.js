export const AuthMiddleware = async (req, res, next) => {
    try {
    
    } catch (error) {
        res.status(500).json({ message: "Error auth Middleware", error: err.message });

    }
}