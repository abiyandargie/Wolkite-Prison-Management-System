import express from "express";
import cors from "cors";
import reportsRouter from "./router/reports.router.js";
import transferRouter from "./router/transferRouter.js";
import visitorAccountRouter from "./router/visitorAccount.router.js";
import visitorScheduleRouter from "./router/visitorSchedule.router.js";
import backupRoutes from './router/backup.js';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// ... other middleware and setup ...

// Use the backup routes
app.use('/backup', backupRoutes);
// Routes
app.use("/api/reports", reportsRouter);
app.use("/api/transfer", transferRouter);
app.use("/api", visitorAccountRouter);
app.use("/api/visitorSchedule", visitorScheduleRouter);

export default app;
