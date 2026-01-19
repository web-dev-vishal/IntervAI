import { User } from "../models/user.model.js";
import bcrypt from "bcrypt.js"

export const register = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        if (!fullname || !email || !password) {
            return res.status(401).json({
                message: "Pleased provide all the Fields❗",
                success: false
            })
        }

        const user = await User.findOne({ email })

        if (user) {
            return res.status(401).json({
                message: "User already registered",
                success: false
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await User.create({
            fullname,
            email,
            password: hashedPassword
        })

        return res.status({
            message: "User registed successfully",
            success: true
        })
    }
    catch (err) {
        res.status(500).json({ message: "Error registering user", error: err.message });
    }
}

export const login = async  (req,res)=>{
    try{

    }
    catch (err) {
        res.status(500).json({ message: "Error registering user", error: err.message });
    }
}

// export const  = async  (req,res)=>{
//     try{

//     }
//     catch (err) {
//         res.status(500).json({ message: "Error registering user", error: err.message });
//     }
// }