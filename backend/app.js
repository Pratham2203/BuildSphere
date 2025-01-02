import express from "express";
import morgan from "morgan";
import connect from "./db/db.js";
import userRoutes from "./routes/user.routes.js"
import aiRoutes from "./routes/ai.routes.js"
import projectRoutes from "./routes/project.routes.js"
import cookieParser from "cookie-parser";
import cors from "cors";
import 'dotenv/config';
const app=express();
connect();
app.use(cookieParser());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use("/users",userRoutes);
app.use("/projects",projectRoutes);
app.use("/ai",aiRoutes);
app.get('/', (req, res) => {
    res.send('Hello World!');
});
export default app;