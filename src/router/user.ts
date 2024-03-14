import express from "express";
const user = express.Router();
import { body } from "express-validator";
import { validateRequest } from "../middlewares/reqValidator";
import { verifyCredentials, verifyOtp } from "../controllers/user_auth";

user.post(
  "/signin",
  [
    body("empID", "employee ID required").exists().isString(),
    body("password", "password is required").exists().isString(),
  ],
  validateRequest,
  verifyCredentials
);

user.post(
  "/verify_otp",
  [
    body("empID", "employee ID is required").exists(),
    body("otp", "otp required").exists().isNumeric(),
  ],
  verifyOtp
);

export default user;
