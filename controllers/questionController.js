import Groq from "groq-sdk";
import { Session } from "../models/session.model.js";
import { Question } from "../models/question.model.js";
import mongoose from "mongoose";

let groqInstance = null;

const getGroqClient = () => {
    if (groqInstance) {
        return groqInstance;
    }

    const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_API;
    
    if (!apiKey || apiKey.trim() === '') {
        console.error('GROQ API key is missing from environment variables');
        return null;
    }
    
    if (!apiKey.startsWith('gsk_')) {
        console.warn('GROQ API key format may be invalid. Expected format: gsk_...');
    }
    
    groqInstance = new Groq({ apiKey: apiKey.trim() });
    return groqInstance;
};

/**
 * Generate interview questions using Groq AI
 * @route POST /api/questions/generate
 * @access Private (requires authentication)
 */
export const generateInterviewQuestion = async (req, res) => {
    try {
        const groq = getGroqClient();
        
        if (!groq) {
            return res.status(500).json({
                message: "AI service is not configured. Please add GROQ_API to your .env file",
                success: false,
                hint: "Add GROQ_API=gsk_... to your .env file and restart the server"
            });
        }

        const { role, experience, topicsToFocus, sessionId } = req.body;

        // Validation - all fields required
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

        // Validate role and experience are non-empty strings
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

        // Validate topicsToFocus is array and not empty
        if (!Array.isArray(topicsToFocus) || topicsToFocus.length === 0) {
            return res.status(400).json({
                message: "topicsToFocus must be a non-empty array",
                success: false
            });
        }

        // Validate each topic is a non-empty string
        const invalidTopics = topicsToFocus.filter(topic => 
            typeof topic !== 'string' || topic.trim().length === 0
        );
        
        if (invalidTopics.length > 0) {
            return res.status(400).json({
                message: "All topics must be non-empty strings",
                success: false
            });
        }

        // Validate sessionId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                message: "Invalid session ID format",
                success: false
            });
        }

        // Check if session exists
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                message: "Session not found",
                success: false
            });
        }

        // Authorization check - ensure session belongs to logged-in user
        if (session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to generate questions for this session",
                success: false
            });
        }

        // Check if session already has questions (prevent duplicates)
        if (session.questions && session.questions.length >= 50) {
            return res.status(400).json({
                message: "Session has reached maximum number of questions (50)",
                success: false,
                currentCount: session.questions.length
            });
        }

        // Create prompt for Groq
        const topicsString = topicsToFocus.map(t => t.trim()).join(', ');

        const prompt = `You are an expert interview question generator.
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

Now generate 5 high-quality interview questions with detailed answers:`;
        
        // Call Groq API with error handling
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
            // Handle specific error types
            if (apiError.status === 401 || apiError.error?.error?.code === 'invalid_api_key') {
                return res.status(500).json({
                    message: "AI service authentication failed. Invalid or expired API key",
                    success: false,
                    error: "Invalid API key",
                    hint: "Please verify GROQ_API in your .env file. Get a new key from https://console.groq.com/keys",
                    troubleshooting: {
                        step1: "Go to https://console.groq.com/keys",
                        step2: "Create a new API key",
                        step3: "Update GROQ_API in your .env file",
                        step4: "Restart the server"
                    }
                });
            }

            if (apiError.status === 429) {
                return res.status(429).json({
                    message: "AI service rate limit exceeded. Please try again in a moment",
                    success: false,
                    error: "Rate limit exceeded"
                });
            }

            if (apiError.status === 503 || apiError.status === 502) {
                return res.status(503).json({
                    message: "AI service is temporarily unavailable. Please try again later",
                    success: false,
                    error: "Service unavailable"
                });
            }

            return res.status(503).json({
                message: "Failed to connect to AI service. Please try again later",
                success: false,
                error: apiError.message
            });
        }

        // Get response text
        let rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            return res.status(500).json({
                message: "Failed to generate questions from AI - empty response",
                success: false
            });
        }

        // Clean the response - remove markdown code blocks and extra whitespace
        rawText = rawText.replace(/```json|```/gi, "").trim();
        
        // Extract JSON array from text
        const match = rawText.match(/\[([\s\S]*?)\]/);
        if (match) {
            rawText = match[0];
        } else {
            return res.status(500).json({
                message: "AI response did not contain a valid JSON array",
                success: false
            });
        }

        // Parse JSON with error handling
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            return res.status(500).json({
                message: "Invalid response format from AI model - could not parse JSON",
                error: err.message,
                success: false
            });
        }

        // Validate parsed data is an array
        if (!Array.isArray(data)) {
            return res.status(500).json({
                message: "AI did not return a valid array",
                success: false
            });
        }

        // Validate data is not empty
        if (data.length === 0) {
            return res.status(500).json({
                message: "AI returned an empty array",
                success: false
            });
        }

        // Validate each question has required fields
        const validQuestions = data.filter(q => {
            return q && 
                   typeof q === 'object' && 
                   q.question && 
                   typeof q.question === 'string' && 
                   q.question.trim() !== '' &&
                   q.answer && 
                   typeof q.answer === 'string' && 
                   q.answer.trim() !== '';
        });
        
        if (validQuestions.length === 0) {
            return res.status(500).json({
                message: "No valid questions generated - all questions missing required fields",
                success: false
            });
        }

        // Create questions in database
        let createdQuestions;
        try {
            createdQuestions = await Question.insertMany(
                validQuestions.map(q => ({
                    session: sessionId,
                    question: q.question.trim(),
                    answer: q.answer.trim(),
                    isPinned: false
                })),
                { ordered: false }
            );
        } catch (dbError) {
            if (dbError.insertedDocs && dbError.insertedDocs.length > 0) {
                createdQuestions = dbError.insertedDocs;
            } else {
                return res.status(500).json({
                    message: "Failed to save questions to database",
                    error: dbError.message,
                    success: false
                });
            }
        }

        // Update session with question references
        try {
            session.questions.push(...createdQuestions.map(q => q._id));
            await session.save();
        } catch (saveError) {
            console.error('Error updating session:', saveError);
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
        console.error('Error in generateInterviewQuestion:', error);
        return res.status(500).json({
            message: "Error generating interview questions",
            error: error.message,
            success: false
        });
    }
};

/**
 * Toggle pin status of a question
 * @route POST /api/questions/:id/toggle-pin
 * @access Private (requires authentication)
 */
export const togglePinQuestion = async (req, res) => {
    try {
        const questionId = req.params.id;

        // Validate questionId format
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({
                message: "Invalid question ID format",
                success: false
            });
        }

        // Find question and populate session with user field
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

        // Check if session exists
        if (!question.session) {
            return res.status(404).json({
                message: "Session associated with this question not found",
                success: false
            });
        }

        // Authorization check
        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to modify this question",
                success: false
            });
        }

        // Toggle pin status
        question.isPinned = !question.isPinned;

        // Save
        try {
            await question.save();
        } catch (saveError) {
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
        console.error('Error in togglePinQuestion:', error);
        return res.status(500).json({
            message: "Error toggling pin status",
            error: error.message,
            success: false
        });
    }
};