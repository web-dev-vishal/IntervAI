import Groq from "groq-sdk";
import { Session } from "../models/session.model.js";
import { Question } from "../models/question.model.js";
import mongoose from "mongoose";

// ✅ Initialize Groq with explicit API key
const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY || process.env.GROQ_API || ''
});

export const generateInterviewQuestion = async (req, res) => {
    try {
        // ✅ Check if API key exists
        if (!process.env.GROQ_API_KEY && !process.env.GROQ_API) {
            console.error('[CONFIG] GROQ API key is missing');
            return res.status(500).json({
                message: "GROQ API key is not configured. Please add GROQ_API_KEY to your .env file",
                success: false
            });
        }

        const { role, experience, topicsToFocus, sessionId } = req.body;

        // ✅ Validation - all fields required
        if (!role || !experience || !topicsToFocus || !sessionId) {
            return res.status(400).json({
                message: "Please provide all required fields: role, experience, topicsToFocus, sessionId",
                success: false,
                missingFields: {
                    role: !role,
                    experience: !experience,
                    topicsToFocus: !topicsToFocus,
                    sessionId: !sessionId
                }
            });
        }

        // ✅ Validate role and experience are non-empty strings
        if (typeof role !== 'string' || role.trim().length === 0) {
            return res.status(400).json({
                message: "Role must be a non-empty string",
                success: false
            });
        }

        if (typeof experience !== 'string' || experience.trim().length === 0) {
            return res.status(400).json({
                message: "Experience must be a non-empty string",
                success: false
            });
        }

        // ✅ Validate topicsToFocus is array and not empty
        if (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0) {
            return res.status(400).json({
                message: "topicsToFocus must be a non-empty array",
                success: false
            });
        }

        // ✅ Validate each topic is a non-empty string
        const invalidTopics = topicsToFocus.filter(topic => 
            typeof topic !== 'string' || topic.trim().length === 0
        );
        
        if (invalidTopics.length > 0) {
            return res.status(400).json({
                message: "All topics must be non-empty strings",
                success: false
            });
        }

        // ✅ Validate sessionId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // ✅ Check if session exists
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        // ✅ Authorization check - ensure session belongs to logged-in user
        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to generate questions for this session",
                success: false
            });
        }

        // ✅ Optional: Check if session already has questions (prevent duplicates)
        if (session.questions && session.questions.length >= 50) {
            return res.status(400).json({
                message: "Session has reached maximum number of questions (50)",
                success: false,
                currentCount: session.questions.length
            });
        }

        // ✅ Create prompt for Groq
        const topicsString = topicsToFocus.map(t => t.trim()).join(', ');

        const prompt = `
You are an expert interview question generator.
Generate exactly 5 interview questions for the following role and experience level.

Role: ${role.trim()}
Experience Level: ${experience.trim()}
Topics to Focus: ${topicsString}

IMPORTANT: Return ONLY a valid JSON array with no additional text, explanations, or markdown formatting.
Each object must have "question" and "answer" fields.

Example format:
[
  {"question": "What is React and why is it used?", "answer": "React is a JavaScript library for building user interfaces, particularly single-page applications. It's used because it allows developers to create reusable UI components and efficiently update the DOM."},
  {"question": "Explain the concept of Virtual DOM.", "answer": "Virtual DOM is a lightweight copy of the actual DOM. React uses it to minimize direct DOM manipulation by calculating the difference between the current and new virtual DOM, then updating only the changed parts in the real DOM."}
]

Now generate 5 high-quality interview questions with detailed answers:
`;

        console.log('[AI] Calling Groq API with model: llama-3.1-8b-instant');
        console.log('[AI] Request details:', {
            role: role.trim(),
            experience: experience.trim(),
            topicsCount: topicsToFocus.length,
            sessionId
        });
        
        // ✅ Call Groq API with detailed configuration and timeout
        let completion;
        try {
            completion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert technical interviewer. Generate only valid JSON arrays with no additional formatting or text."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 1,
                stream: false,
                stop: null
            });
        } catch (apiError) {
            console.error('[AI] Groq API error:', apiError);
            return res.status(503).json({
                message: "Failed to connect to AI service. Please try again later.",
                error: apiError.message,
                success: false
            });
        }

        console.log('[AI] Groq API response received');
        
        // ✅ Log token usage if available
        if (completion.usage) {
            console.log('[AI] Token usage:', {
                prompt_tokens: completion.usage.prompt_tokens,
                completion_tokens: completion.usage.completion_tokens,
                total_tokens: completion.usage.total_tokens
            });
        }

        // ✅ Get response text
        let rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            console.error('[AI] Empty response from Groq API');
            return res.status(500).json({
                message: "Failed to generate questions from AI - empty response",
                success: false
            });
        }

        console.log('[AI] Raw response length:', rawText.length);

        // ✅ Clean the response - remove markdown code blocks and extra whitespace
        rawText = rawText.replace(/```json|```/gi, "").trim();
        
        // ✅ Extract JSON array from text (handle cases where AI adds extra text)
        const match = rawText.match(/\[([\s\S]*?)\]/);
        if (match) {
            rawText = match[0];
        } else {
            console.error('[AI] No JSON array found in response:', rawText.substring(0, 200));
            return res.status(500).json({
                message: "AI response did not contain a valid JSON array",
                success: false
            });
        }

        // ✅ Parse JSON with error handling
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            console.error('[AI] Failed to parse JSON:', {
                error: err.message,
                rawText: rawText.substring(0, 500)
            });
            return res.status(500).json({
                message: "Invalid response format from AI model - could not parse JSON",
                error: err.message,
                success: false
            });
        }

        // ✅ Validate parsed data is an array
        if (!Array.isArray(data)) {
            console.error('[AI] Parsed data is not an array:', typeof data);
            return res.status(500).json({
                message: "AI did not return a valid array",
                success: false
            });
        }

        // ✅ Validate data is not empty
        if (data.length === 0) {
            console.error('[AI] AI returned empty array');
            return res.status(500).json({
                message: "AI returned an empty array",
                success: false
            });
        }

        // ✅ Validate each question has required fields with detailed logging
        const validQuestions = data.filter((q, index) => {
            const isValid = q && 
                   typeof q === 'object' && 
                   q.question && 
                   typeof q.question === 'string' && 
                   q.question.trim() !== '' &&
                   q.answer && 
                   typeof q.answer === 'string' && 
                   q.answer.trim() !== '';
            
            if (!isValid) {
                console.warn(`[AI] Invalid question at index ${index}:`, {
                    hasQuestion: !!q?.question,
                    hasAnswer: !!q?.answer,
                    questionType: typeof q?.question,
                    answerType: typeof q?.answer
                });
            }
            
            return isValid;
        });
        
        if (validQuestions.length === 0) {
            console.error('[AI] No valid questions generated from data:', data);
            return res.status(500).json({
                message: "No valid questions generated - all questions missing required fields",
                success: false
            });
        }

        console.log(`[AI] Generated ${validQuestions.length} valid questions out of ${data.length} total`);

        // ✅ Create questions in database with error handling
        let createdQuestions;
        try {
            createdQuestions = await Question.insertMany(
                validQuestions.map((q) => ({
                    session: sessionId,
                    question: q.question.trim(),
                    answer: q.answer.trim(),
                    isPinned: false // Ensure default value
                })),
                { ordered: false } // Continue inserting even if one fails
            );
            console.log(`[DB] Successfully inserted ${createdQuestions.length} questions`);
        } catch (dbError) {
            console.error('[DB] Error inserting questions:', dbError);
            
            // Check if it's a partial insertion error
            if (dbError.insertedDocs && dbError.insertedDocs.length > 0) {
                createdQuestions = dbError.insertedDocs;
                console.log(`[DB] Partial insertion: ${createdQuestions.length} questions saved`);
            } else {
                return res.status(500).json({
                    message: "Failed to save questions to database",
                    error: dbError.message,
                    success: false
                });
            }
        }

        // ✅ Update session with question references
        try {
            session.questions.push(...createdQuestions.map(q => q._id));
            await session.save();
            console.log(`[DB] Session updated with ${createdQuestions.length} new questions`);
        } catch (saveError) {
            console.error('[DB] Error updating session:', saveError);
            // Questions are created but session not updated - log but don't fail
            console.warn('[DB] Questions created but session update failed - questions:', 
                createdQuestions.map(q => q._id));
        }

        return res.status(201).json({
            message: "Questions generated successfully",
            success: true,
            count: createdQuestions.length,
            aiModel: "llama-3.1-8b-instant",
            provider: "Groq",
            tokensUsed: completion.usage?.total_tokens || 0,
            questions: createdQuestions
        });

    } catch (error) {
        console.error('[ERROR] Error in generateInterviewQuestion:', {
            message: error.message,
            stack: error.stack
        });
        return res.status(500).json({
            message: "Error generating interview questions",
            error: error.message,
            success: false
        });
    }
};

/**
 * Toggle pin status of a question
 * @route POST /api/questions/toggleQuestion/:id
 * @access Private (requires authentication)
 */
export const togglePinQuestion = async (req, res) => {
    try {
        const questionId = req.params.id;

        // ✅ Validate questionId format (MongoDB ObjectId is 24 hex characters)
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // ✅ Find question and populate session with user field
        const question = await Question.findById(questionId).populate({
            path: 'session',
            select: 'user'
        });

        if (!question) {
            return res.status(404).json({
                message: "Question not found",
                success: false
            });
        }

        // ✅ Check if session exists (in case of orphaned question)
        if (!question.session) {
            console.warn('[DB] Orphaned question found:', questionId);
            return res.status(404).json({
                message: "Session associated with this question not found",
                success: false
            });
        }

        // ✅ Authorization check - verify user owns the session
        if (question.session.user.toString() !== req.id) {
            console.warn('[AUTH] Unauthorized pin toggle attempt:', {
                questionId,
                sessionUser: question.session.user.toString(),
                requestUser: req.id
            });
            return res.status(403).json({
                message: "You don't have permission to modify this question",
                success: false
            });
        }

        // ✅ Store previous state for logging
        const previousState = question.isPinned;

        // ✅ Toggle pin status
        question.isPinned = !question.isPinned;

        // ✅ Save with error handling
        try {
            await question.save();
            console.log(`[DB] Question ${questionId} pin status changed: ${previousState} -> ${question.isPinned}`);
        } catch (saveError) {
            console.error('[DB] Error saving question:', saveError);
            return res.status(500).json({
                message: "Failed to update question",
                error: saveError.message,
                success: false
            });
        }

        return res.status(200).json({
            message: `Question ${question.isPinned ? 'pinned' : 'unpinned'} successfully`,
            success: true,
            isPinned: question.isPinned,
            questionId: question._id
        });
        
    } catch (error) {
        console.error('[ERROR] Error in togglePinQuestion:', {
            message: error.message,
            stack: error.stack,
            questionId: req.params.id
        });
        return res.status(500).json({
            message: "Error toggling pin status",
            error: error.message,
            success: false
        });
    }
};