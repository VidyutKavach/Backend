import express from "express";
const router = express.Router();
import admin from "./admin";
import user from "./user";

router.use("/admin", admin);
router.use("/user", user);

export default router;
