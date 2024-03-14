import express, { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import dbConnect from "./config/db";
import cors from "cors";
import { json, urlencoded } from "body-parser";
import rateLimit from "express-rate-limit";
import logger from "morgan";
import router from "./router/index";

require("./config/mqtt");

const app = express();
//Cors Policy
app.use(
  cors({
    origin: "*",
  })
);
const PORT = process.env.PORT || 5000;
dbConnect();

//rate limiter
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 2500, // limit each IP to 4 requests per windowMs
});
app.set("trust proxy", 1);
app.use(limiter);
app.use(json());
// app.use(cors({ origin: "*" }));
app.use(urlencoded({ extended: true }));
app.use(logger("dev"));
app.use("/", router);

export default app;
