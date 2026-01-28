// import express from "express";
// import { AuthMiddleware } from "../middlewares/auth.middleware.js";
// import { downloadExport, exportQuestions, getExportStatus } from "../controllers/exportController.js";

// const router = express.Router();

// router.post('/export',AuthMiddleware,exportQuestions);

// router.get('/getexportstatus',AuthMiddleware,getExportStatus);

// router.get('/download',AuthMiddleware,downloadExport);

// export default router;

import express from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import { downloadExport, exportQuestions, getExportStatus } from "../controllers/exportController.js";

const router = express.Router();

router.post('/export/:sessionId', AuthMiddleware, exportQuestions);

router.get('/status/:jobId', AuthMiddleware, getExportStatus);

router.get('/download/:filename', AuthMiddleware, downloadExport);

export default router;