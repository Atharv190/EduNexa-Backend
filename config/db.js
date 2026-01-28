import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async ()=> {
    try
    {
        const conn = await mongoose.connect(process.env.MONGO_DB);
        console.log("Database Connected For EduNexa...!!");
    }
    catch(err)
    {
        console.log("Error...!!",err);
    }
}

export default connectDB;