import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, 'User is required'],
        index: true
    },
    role: {
        type: String,
        required: [true, 'Role is required'],
        enum: {
            values: [
                'interviewer',
                'interviewee',
                'mock-interview',
                'practice',
                'Backend Developer',
                'Frontend Developer',
                'Full Stack Developer',
                'DevOps Engineer',
                'Data Scientist'
            ],
            message: '{VALUE} is not a valid role'
        },
        trim: true
    },
    experience: {
        type: String,
        required: [true, 'Experience level is required'],
        enum: {
            values: ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'expert'],
            message: '{VALUE} is not a valid experience level'
        },
        trim: true
    },
    topicsToFocus: [{
        type: String,
        trim: true,
        required: [true, 'At least one topic is required']
    }],
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
    }],
    status: {
        type: String,
        enum: {
            values: ['pending', 'in-progress', 'completed', 'cancelled'],
            message: '{VALUE} is not a valid status'
        },
        default: 'pending',
        index: true
    },
    duration: {
        type: Number,
        min: [1, 'Duration must be at least 1 minute'],
        max: [300, 'Duration cannot exceed 300 minutes'],
        default: 60
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

sessionSchema.index({ user: 1, createdAt: -1 });
sessionSchema.index({ user: 1, status: 1 });

sessionSchema.virtual('questionCount').get(function() {
    return this.questions ? this.questions.length : 0;
});

export const Session = mongoose.model("Session", sessionSchema);