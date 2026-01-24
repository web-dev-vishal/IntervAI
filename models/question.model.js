// import mongoose from "mongoose";

// const questionSchema = new mongoose.Schema({
//     session: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Session",
//         required: [true, 'Session reference is required'],
//         index: true // For faster queries by session
//     },
//     question: {
//         type: String,
//         required: [true, 'Question text is required'],
//         trim: true,
//         minlength: [5, 'Question must be at least 5 characters long'],
//         maxlength: [2000, 'Question cannot exceed 2000 characters']
//     },
//     answer: {
//         type: String,
//         trim: true,
//         maxlength: [5000, 'Answer cannot exceed 5000 characters'],
//         default: '' // Empty string if not answered yet
//     },
//     notes: { 
//         type: String,
//         trim: true,
//         maxlength: [1000, 'Notes cannot exceed 1000 characters'],
//         default: ''
//     },
//     isPinned: {
//         type: Boolean,
//         default: false
//     },
//     difficulty: {
//         type: String,
//         enum: {
//             values: ['easy', 'medium', 'hard'],
//             message: '{VALUE} is not a valid difficulty level'
//         },
//         default: 'medium'
//     },
//     category: {
//         type: String,
//         trim: true,
//         maxlength: [100, 'Category cannot exceed 100 characters']
//     },
//     isAnswered: {
//         type: Boolean,
//         default: false
//     }
// }, {
//     timestamps: true
// });

// // Compound index for efficient querying
// questionSchema.index({ session: 1, isPinned: -1, createdAt: -1 });

// // Pre-save hook to auto-set isAnswered based on answer field
// questionSchema.pre('save', function(next) {
//     this.isAnswered = this.answer && this.answer.trim().length > 0;
//     next();
// });

// // Virtual to get answer word count
// questionSchema.virtual('answerWordCount').get(function() {
//     if (!this.answer) return 0;
//     return this.answer.trim().split(/\s+/).length;
// });

// export const Question = mongoose.model("Question", questionSchema);

import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: [true, 'Session reference is required'],
        index: true
    },
    question: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true,
        minlength: [5, 'Question must be at least 5 characters long'],
        maxlength: [2000, 'Question cannot exceed 2000 characters']
    },
    answer: {
        type: String,
        required: [true, 'Answer text is required'], // FIXED: Answer is required
        trim: true,
        minlength: [10, 'Answer must be at least 10 characters long'], // ADDED: Minimum length
        maxlength: [5000, 'Answer cannot exceed 5000 characters']
    },
    notes: { 
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters'],
        default: ''
    },
    isPinned: {
        type: Boolean,
        default: false,
        index: true // ADDED: Index for faster pinned queries
    },
    difficulty: {
        type: String,
        enum: {
            values: ['easy', 'medium', 'hard'],
            message: '{VALUE} is not a valid difficulty level'
        },
        default: 'medium'
    },
    category: {
        type: String,
        trim: true,
        maxlength: [100, 'Category cannot exceed 100 characters'],
        default: '' // ADDED: Default empty string
    },
    isAnswered: {
        type: Boolean,
        default: true // FIXED: Changed to true since answer is now required
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true }, // ADDED: Include virtuals in JSON
    toObject: { virtuals: true } // ADDED: Include virtuals in objects
});

// Compound index for efficient querying
questionSchema.index({ session: 1, isPinned: -1, createdAt: -1 });

// REMOVED: Pre-save hook (not needed since answer is required)
// Answer is always present, so isAnswered is always true

// Virtual to get answer word count
questionSchema.virtual('answerWordCount').get(function() {
    if (!this.answer) return 0;
    return this.answer.trim().split(/\s+/).filter(word => word.length > 0).length; // FIXED: Filter empty strings
});

// Virtual to get question word count - ADDED
questionSchema.virtual('questionWordCount').get(function() {
    if (!this.question) return 0;
    return this.question.trim().split(/\s+/).filter(word => word.length > 0).length;
});

export const Question = mongoose.model("Question", questionSchema);