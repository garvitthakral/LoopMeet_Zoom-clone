import express from "express";
import { login, register } from "../controllers/userRegister.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
// router.post("/add_to_history");
// router.post("/all_history");

export default router;
