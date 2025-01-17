import express from "express";
const router = express.Router();
import { body } from "express-validator";
import {
  add_privilege,
  get_privileges,
  get_roles,
  add_role,
} from "../controllers/roleController";
import {
  isEmailUnique,
  isEmpIdUnique,
  isCorrectRole,
  validateRequest,
} from "../middlewares/reqValidator";
import { signUp, verifyCredentials } from "../controllers/user_auth";

router.get(
  "/get_privileges",
  // checkToken, check_admin,
  get_privileges
);

router.post(
  "/add_privilege",
  // checkToken, check_admin,
  [body("name", "name is required").exists().isString()],
  validateRequest,
  add_privilege
);

router.post(
  "/add_role",
  // checkToken, check_admin,
  [
    body("name", "name of role is required").exists(),
    body("privileges", "select privileges").exists().isArray(),
  ],
  validateRequest,
  add_role
);

router.get("/get_roles", get_roles);

router.post(
  "/signup",
  // checkToken, check_admin,
  [
    body("empID", "Employee ID missing.")
      .exists()
      .isString()
      .custom(isEmpIdUnique),
    body("username", "Name should be at least 5 characters.")
      .exists()
      .isString()
      .isLength({ min: 5 }),
    body("email", "Email is required.")
      .exists()
      .isEmail()
      .custom(isEmailUnique),
    body("role", "Role is not specified.").exists().isString(),
    body("password", "Password should be at least 2 characters.")
      .exists()
      .isLength({ min: 6 }),
  ],
  validateRequest,
  signUp
);

export default router;
