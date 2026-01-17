import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected successfully`);
    } catch (error) {
        console.log(`Error in Connect DB${error}`);   
    }
}