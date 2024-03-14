import express from "express";
const router = express.Router();
import admin from "./admin";

router.use("/admin", admin);

export default router;
