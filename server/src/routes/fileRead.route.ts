import { Router } from "express";
import { getUsers, readFile } from "../controllers/fileRead.controller";

const router = Router();

router.get("/", getUsers);
router.post("/", readFile);

export default router;