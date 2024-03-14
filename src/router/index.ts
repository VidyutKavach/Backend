import express from "express";
const router = express.Router();
import admin from "./admin";
import user from "./user";
import component from "./components";

router.use("/admin", admin);
router.use("/user", user);
router.use("/component", component);

export default router;
