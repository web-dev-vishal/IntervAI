import { Session } from "../models/session.model.js";
import { Question } from "../models/question.model.js";
import mongoose from "mongoose";
import { exportQueue } from "../config/queue.js";
import path from 'path';
import fs from 'fs/promises';

export const exportQuestions = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { format } = req.query;

        if (!['pdf', 'csv', 'docx'].includes(format)) {
            return res.status(400).json({
                success: false,
                message: "Invalid format. Use pdf, csv, or docx"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID"
            });
        }

        const session = await Session.findById(sessionId).select('user').lean();
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access"
            });
        }

        const job = await exportQueue.add({
            sessionId,
            userId: req.id,
            format
        });

        return res.status(202).json({
            success: true,
            message: "Export queued",
            jobId: job.id,
            checkStatusUrl: `/api/v1/export/status/${job.id}`
        });

    } catch (error) {
        console.error('[exportQuestions]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getExportStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await exportQueue.getJob(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Export job not found"
            });
        }

        const state = await job.getState();

        if (state === 'completed') {
            const result = job.returnvalue;
            return res.status(200).json({
                success: true,
                status: 'completed',
                downloadUrl: `/api/v1/export/download/${result.filename}`
            });
        }

        if (state === 'failed') {
            return res.status(200).json({
                success: false,
                status: 'failed',
                error: job.failedReason
            });
        }

        return res.status(200).json({
            success: true,
            status: state
        });

    } catch (error) {
        console.error('[getExportStatus]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const downloadExport = async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(process.cwd(), 'exports', filename);

        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        res.download(filepath, filename, async (err) => {
            if (err) {
                console.error('[Download Error]', err);
            }
            // Delete file after download
            try {
                await fs.unlink(filepath);
            } catch (unlinkErr) {
                console.error('[File Delete Error]', unlinkErr);
            }
        });

    } catch (error) {
        console.error('[downloadExport]', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};