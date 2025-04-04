// import express from "express";
// import { authenticateToken } from "../utilities.js";
// import { addClearance, deleteClearance, getAllClearance, getClearance, updateClearance } from "../controller/clearance.controller.js";
import express from "express";
import {
  getAllClearances,
  getClearanceById,
  createClearance,
  updateClearance,
  deleteClearance,
} from "../controller/clearance.controller.js";
import { upload } from "../fileMiddleware.js";
// export const clearanceRouter = express.Router();
// clearanceRouter.post("/add-clearance",upload.single("sign"), authenticateToken, addClearance);
// clearanceRouter.get("/getAllClearance", authenticateToken, getAllClearance);
// clearanceRouter.get("/get-clearance/:id", authenticateToken, getClearance);
// clearanceRouter.put("/update-clearance/:id", authenticateToken, updateClearance);
// // clearanceRouter.put("/delete-clearance/:id", authenticateToken, deleteClearance


export const clearanceRoutes = express.Router();

clearanceRoutes.get("/getAllClearance", getAllClearances);
clearanceRoutes.get("/getClearance/:id", getClearanceById);
clearanceRoutes.post("/addClearance", upload.single("sign"), createClearance);
clearanceRoutes.put("/updateClearance/:id", upload.single("sign"), updateClearance);
clearanceRoutes.delete("/deleteClearance/:id", deleteClearance);
