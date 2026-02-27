import { Router } from "express";
import {  readFile } from "../controllers/fileRead.controller";

const router = Router();

router.post("/", readFile);

export default router;