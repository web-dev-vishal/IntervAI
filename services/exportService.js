// ============================================
// services/exportService.js (FIXED)
// ============================================
import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { Question } from '../models/question.model.js';
import { Session } from '../models/session.model.js';

export class ExportService {
    static async generatePDF(sessionId, userId) {
        const session = await Session.findById(sessionId).lean();
        const questions = await Question.find({ session: sessionId }).lean();

        if (!session || !questions.length) {
            throw new Error('No data found for export');
        }

        const filename = `questions_${sessionId}_${Date.now()}.pdf`;
        const filepath = path.join(process.cwd(), 'exports', filename);

        await fs.mkdir(path.dirname(filepath), { recursive: true });

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const stream = createWriteStream(filepath);

            stream.on('error', reject);
            stream.on('finish', () => resolve(filename));

            doc.pipe(stream);

            doc.fontSize(24).font('Helvetica-Bold').text('Interview Questions', { align: 'center' });
            doc.moveDown(0.5);
            
            doc.fontSize(12).font('Helvetica');
            doc.text(`Role: ${session.role}`);
            doc.text(`Experience: ${session.experience}`);
            doc.text(`Topics: ${session.topicsToFocus.join(', ')}`);
            doc.text(`Total Questions: ${questions.length}`);
            doc.moveDown(1);

            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(1);

            questions.forEach((q, index) => {
                if (doc.y > 700) {
                    doc.addPage();
                }

                doc.fontSize(14).font('Helvetica-Bold')
                   .text(`Q${index + 1}: ${q.question}`, { continued: false });
                doc.moveDown(0.5);
                
                doc.fontSize(11).font('Helvetica')
                   .text(`Answer: ${q.answer}`, { align: 'justify' });
                doc.moveDown(1);

                if (q.isPinned) {
                    doc.fontSize(9).fillColor('blue').text('📌 Pinned', { continued: false });
                    doc.fillColor('black');
                }

                doc.moveDown(0.5);
                doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown(1);
            });

            doc.end();
        });
    }

    static async generateCSV(sessionId, userId) {
        const questions = await Question.find({ session: sessionId }).lean();

        if (!questions.length) {
            throw new Error('No questions found for export');
        }

        const filename = `questions_${sessionId}_${Date.now()}.csv`;
        const filepath = path.join(process.cwd(), 'exports', filename);

        await fs.mkdir(path.dirname(filepath), { recursive: true });

        const csvWriter = createObjectCsvWriter({
            path: filepath,
            header: [
                { id: 'number', title: 'No.' },
                { id: 'question', title: 'Question' },
                { id: 'answer', title: 'Answer' },
                { id: 'isPinned', title: 'Pinned' },
                { id: 'difficulty', title: 'Difficulty' },
                { id: 'category', title: 'Category' },
                { id: 'createdAt', title: 'Created At' }
            ]
        });

        await csvWriter.writeRecords(questions.map((q, idx) => ({
            number: idx + 1,
            question: q.question,
            answer: q.answer,
            isPinned: q.isPinned ? 'Yes' : 'No',
            difficulty: q.difficulty || 'N/A',
            category: q.category || 'N/A',
            createdAt: new Date(q.createdAt).toISOString()
        })));

        return filename;
    }

    static async generateDOCX(sessionId, userId) {
        const session = await Session.findById(sessionId).lean();
        const questions = await Question.find({ session: sessionId }).lean();

        if (!session || !questions.length) {
            throw new Error('No data found for export');
        }

        const filename = `questions_${sessionId}_${Date.now()}.docx`;
        const filepath = path.join(process.cwd(), 'exports', filename);

        await fs.mkdir(path.dirname(filepath), { recursive: true });

        const children = [
            new Paragraph({
                text: 'Interview Questions',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: 'Role: ', bold: true }),
                    new TextRun(session.role)
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: 'Experience: ', bold: true }),
                    new TextRun(session.experience)
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: 'Topics: ', bold: true }),
                    new TextRun(session.topicsToFocus.join(', '))
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: 'Total Questions: ', bold: true }),
                    new TextRun(questions.length.toString())
                ],
                spacing: { after: 400 }
            })
        ];

        questions.forEach((q, index) => {
            children.push(
                new Paragraph({
                    text: `Question ${index + 1}`,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: q.question })],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    text: 'Answer:',
                    heading: HeadingLevel.HEADING_3,
                    spacing: { after: 50 }
                }),
                new Paragraph({
                    children: [new TextRun({ text: q.answer })],
                    spacing: { after: 200 }
                })
            );

            if (q.isPinned) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: '📌 Pinned', color: '0000FF' })],
                        spacing: { after: 200 }
                    })
                );
            }
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(filepath, buffer);

        return filename;
    }
}