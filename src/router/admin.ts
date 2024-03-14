import express from "express";
const admin = express.Router();
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

admin.get(
  "/get_privileges",
  // checkToken, check_admin,
  get_privileges
);

admin.post(
  "/add_privilege",
  // checkToken, check_admin,
  [body("name", "name is required").exists().isString()],
  validateRequest,
  add_privilege
);

admin.post(
  "/add_role",
  // checkToken, check_admin,
  [
    body("name", "name of role is required").exists(),
    body("privileges", "select privileges").exists().isArray(),
  ],
  validateRequest,
  add_role
);

admin.get("/get_roles", get_roles);

export default admin;
