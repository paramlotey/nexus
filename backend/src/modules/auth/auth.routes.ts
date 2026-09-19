import { Router } from "express";
import { register, login, refresh } from "./auth.controler.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "./auth.validation.js";

import { validate } from "../../middleware/validate.middleware.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refresh);

export default router;
