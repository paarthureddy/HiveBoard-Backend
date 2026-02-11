import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    password: {
        type: String,
        required: function () {
            // Password is only required if not using Google OAuth
            return this.authProvider === 'local';
        },
        minlength: 6,
        select: false, // Don't return password by default
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true, // Allows null values to be non-unique
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
    },
    avatar: {
        type: String, // Store Google profile picture URL
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // New fields for accumulating report data
    reportData: {
        accumulatedTimeMinutes: { type: Number, default: 0 },
        accumulatedStrokes: { type: Number, default: 0 },
        lastReportDate: { type: Date, default: Date.now }
    }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Skip if password is not modified or doesn't exist (Google OAuth)
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
