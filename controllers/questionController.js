import Groq from "groq-sdk";
import { Session } from "../models/session.model.js";
import { Question } from "../models/question.model.js";

// ✅ Initialize Groq with explicit API key
const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY || process.env.GROQ_API || ''
});

export const generateInterviewQuestion = async (req, res) => {
    try {
        // ✅ Check if API key exists
        if (!process.env.GROQ_API_KEY && !process.env.GROQ_API) {
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

        // ✅ Create prompt for Groq
        const topicsString = topicsToFocus.join(', ');

        const prompt = `
You are an expert interview question generator.
Generate exactly 5 interview questions for the following role and experience level.

Role: ${role}
Experience Level: ${experience}
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
        
        // ✅ Call Groq API with detailed configuration
        const completion = await groq.chat.completions.create({
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
            return res.status(500).json({
                message: "Failed to generate questions from AI - empty response",
                success: false
            });
        }

        // ✅ Clean the response - remove markdown code blocks
        rawText = rawText.replace(/```json|```/gi, "").trim();
        
        // ✅ Extract JSON array from text
        const match = rawText.match(/\[([\s\S]*?)\]/);
        if (match) {
            rawText = match[0];
        }

        // ✅ Parse JSON with error handling
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (err) {
            console.error('[AI] Failed to parse JSON:', rawText);
            return res.status(500).json({
                message: "Invalid response format from AI model - could not parse JSON",
                error: err.message,
                success: false
            });
        }

        // ✅ Validate parsed data is an array
        if (!Array.isArray(data)) {
            return res.status(500).json({
                message: "AI did not return a valid array",
                success: false
            });
        }

        // ✅ Validate data is not empty
        if (data.length === 0) {
            return res.status(500).json({
                message: "AI returned an empty array",
                success: false
            });
        }

        // ✅ Validate each question has required fields
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

        console.log(`[AI] Generated ${validQuestions.length} valid questions out of ${data.length} total`);

        // ✅ Create questions in database with error handling
        let createdQuestions;
        try {
            createdQuestions = await Question.insertMany(
                validQuestions.map((q) => ({
                    session: sessionId,
                    question: q.question.trim(),
                    answer: q.answer.trim(),
                }))
            );
        } catch (dbError) {
            console.error('[DB] Error inserting questions:', dbError);
            return res.status(500).json({
                message: "Failed to save questions to database",
                error: dbError.message,
                success: false
            });
        }

        // ✅ Update session with question references
        try {
            session.questions.push(...createdQuestions.map(q => q._id));
            await session.save();
        } catch (saveError) {
            console.error('[DB] Error updating session:', saveError);
            // Questions are created but session not updated - log but don't fail
            console.log('[DB] Questions created but session update failed - questions:', createdQuestions.map(q => q._id));
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
        console.error('[ERROR] Error in generateInterviewQuestion:', error);
        return res.status(500).json({
            message: "Error generating interview questions",
            error: error.message,
            success: false
        });
    }
};


export const togglePinQuestion = async (req, res) => {
    try {
        const questionId = req.params.id;

        // ✅ Validate questionId format
        if (!questionId || questionId.length !== 24) {
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
            return res.status(404).json({
                message: "Session associated with this question not found",
                success: false
            });
        }

        // ✅ Authorization check - verify user owns the session
        if (question.session.user.toString() !== req.id) {
            return res.status(403).json({
                message: "You don't have permission to modify this question",
                success: false
            });
        }

        // ✅ Toggle pin status
        question.isPinned = !question.isPinned;

        // ✅ Save with error handling
        try {
            await question.save({ validateBeforeSave: false });
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
            isPinned: question.isPinned
        });
        
    } catch (error) {
        console.error('[ERROR] Error in togglePinQuestion:', error.message);
        return res.status(500).json({
            message: "Error toggling pin status",
            error: error.message,
            success: false
        });
    }
};