import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: [true, 'Session reference is required'],
        index: true // For faster queries by session
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
        trim: true,
        maxlength: [5000, 'Answer cannot exceed 5000 characters'],
        default: '' // Empty string if not answered yet
    },
    notes: { 
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters'],
        default: ''
    },
    isPinned: {
        type: Boolean,
        default: false
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
        maxlength: [100, 'Category cannot exceed 100 characters']
    },
    isAnswered: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index for efficient querying
questionSchema.index({ session: 1, isPinned: -1, createdAt: -1 });

// Pre-save hook to auto-set isAnswered based on answer field
questionSchema.pre('save', function(next) {
    this.isAnswered = this.answer && this.answer.trim().length > 0;
    next();
});

// Virtual to get answer word count
questionSchema.virtual('answerWordCount').get(function() {
    if (!this.answer) return 0;
    return this.answer.trim().split(/\s+/).length;
});

export const Question = mongoose.model("Question", questionSchema);