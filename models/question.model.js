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
        required: [true, 'Answer text is required'],
        trim: true,
        minlength: [10, 'Answer must be at least 10 characters long'],
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
        index: true
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
        default: ''
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

questionSchema.index({ session: 1, isPinned: -1, createdAt: -1 });
questionSchema.index({ session: 1, createdAt: -1 });

questionSchema.virtual('answerWordCount').get(function() {
    if (!this.answer) return 0;
    return this.answer.trim().split(/\s+/).filter(word => word.length > 0).length;
});

questionSchema.virtual('questionWordCount').get(function() {
    if (!this.question) return 0;
    return this.question.trim().split(/\s+/).filter(word => word.length > 0).length;
});

export const Question = mongoose.model("Question", questionSchema);