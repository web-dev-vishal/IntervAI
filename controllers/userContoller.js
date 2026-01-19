import { User } from "../models/user.model.js";
import bcrypt from "bcrypt.js";
import jwt from 'jsonwebtoken';
import imagekit from "../config/imagekit.js";
import multer from "multer";

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
        const { email, password }= req.body;
        if(!email || !password){
            return res.status(401).json({
                message: "Pleased provide all the Fields❗",
                success: false
            })
        }

        const user = await User.findOne({email})

        if(!user){
            return res.status(401).json({
                message:"Invalid credentials",
                success:false
            })
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password)

        if(!isPasswordMatch){
            return res.status(401).json({
                message:"Invalid credentials",
                success:false
            })
        }
        
        const token = await jwt.sign({userId: user._id}, process.env.JWT_SECRET)
        return res.cookie('token',token, {httpOnly:true}).json({
            message:`${user.fullname} logged in successfully`,
            success:true,
            user
        })
    } catch (err) {
        res.status(500).json({ message: "Error login user", error: err.message });
    }
}

export const logout = async  (req,res)=>{
    try{
        return res.cookie("token","", {maxAge:0})
        message:"User logged Out successfully"
    } catch (err) {
        res.status(500).json({ message: "Error logout user", error: err.message });
    }
}

export const getUser = async(req, res)=>{
    try {
        const userId = req.id
        const user = await User.findById(userId)
        return res.status(201).json({
            user
        })
    } catch (error) {
        console.log(error)
    }
}

export const updateProfile = async(req,res)=>{
    try {
        const userId = req.id;
        const {fullName} = req.body||{};
         
        const profilePicture = req.file;

        const user = await User.findByIdAndUpdate(userId, {fullName}, {new:true, runValidators:true})

        if(profilePicture){
            const result = await imagekit.upload({
                file:profilePicture.buffer,
                fileName:profilePicture.originalname
            })
            user.profilPhoto  = result.url
        }

        await user.save()
        return res.status(201).json({
            message:"Profile updated successfully",
            user
        })
    } catch (error) {
        console.log(`This error is coming from profile backend, error_>${error}`)
    }
}

// export const  = async  (req,res)=>{
//     try{

//     } catch (err) {
//         res.status(500).json({ message: "Error registering user", error: err.message });
//     }
// }