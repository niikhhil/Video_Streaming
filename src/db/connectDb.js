import mongoose from "mongoose";


const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.DB_URI}`);
        console.log(`\n Mongo DB connected! DB HOST: ${connectionInstance.connection.host}`);
               
    } catch (error) {
        console.log("Monogo Db connection error: ", error);
        process.exit(1);
        
    }
}

export default connectDB;