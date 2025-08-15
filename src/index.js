import dotenv from "dotenv";
import connectDB from "./db/connectDb.js";
import express from "express"

dotenv.config()

const app = express();

const server = async () => {
    try {
        await connectDB();
        app.get('/', (req, res) => {
            res.send("MONGO CONNECTED");
        });
        
        const PORT = `${process.env.PORT}` || 8000;
        app.listen(PORT, () => {
            console.log(`Server is running successfully 👍`); 
        });
    }
    catch (error) {
        console.log("Database not connected: ", error);
    }
}

server();