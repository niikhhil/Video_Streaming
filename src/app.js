import express, { urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
 
app.get("/", (req, res) => {
    res.send(`DB connected`);
});


// importing routes
import userRouter from "./routes/userRoutes.js";

app.use('/api/v1/users', userRouter)
export default app;
