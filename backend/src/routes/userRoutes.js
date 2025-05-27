import { Router } from "express";


const router = Router();

router.route("/login");
router.route("/register");
router.route("add_to_history");
router.route("all_history");

export default router;