import express from "express";
const router = express.Router();
import admin from "./admin";
import user from "./user";
import dashboard from "./dashboard";

router.use("/admin", admin);
router.use("/user", user);
router.use("/dashboard", dashboard);

export default router;
