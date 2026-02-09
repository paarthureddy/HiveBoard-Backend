import express from 'express';
import Meeting from '../models/Meeting.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// --- PUBLIC ROUTES ---

// @route   GET /api/meetings/public/:id
// @desc    Get a single meeting by ID for guests (Public access check)
// @access  Public (if meeting allows guests)
router.get('/public/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Security check: ensure the meeting is configured to allow guests
        if (!meeting.allowGuests) {
            return res.status(403).json({ message: 'Guests are not allowed in this meeting' });
        }

        // Return only necessary info for guests (filtering sensitive data)
        res.json({
            _id: meeting._id,
            title: meeting.title,
            createdBy: meeting.createdBy,
            allowGuests: meeting.allowGuests,
            canvasData: meeting.canvasData, // Needed for initial state
        });
    } catch (error) {
        console.error('Get public meeting error:', error);
        res.status(500).json({ message: 'Server error fetching meeting' });
    }
});

// --- PROTECTED ROUTES (Require Login) ---
// All routes after this middleware require a valid JWT token
router.use(protect);

// @route   GET /api/meetings
// @desc    Get all meetings created by the logged-in user
// @access  Private
router.get('/', async (req, res) => {
    try {
        // Find meetings where 'createdBy' matches the authenticated user ID
        const meetings = await Meeting.find({ createdBy: req.user._id })
            .sort({ updatedAt: -1 }) // Sort by newest first
            .select('-canvasData'); // Exclude heavy canvas data for the list view

        res.json(meetings);
    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ message: 'Server error fetching meetings' });
    }
});

// @route   GET /api/meetings/:id
// @desc    Get a single meeting by ID (with authorization check)
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Authorization check: User must be the owner (TODO: Add shared access check)
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to access this meeting' });
        }

        res.json(meeting);
    } catch (error) {
        console.error('Get meeting error:', error);
        res.status(500).json({ message: 'Server error fetching meeting' });
    }
});

// @route   POST /api/meetings
// @desc    Create a new meeting
// @access  Private
router.post('/', async (req, res) => {
    try {
        const { title, canvasData, thumbnail } = req.body;

        const meeting = await Meeting.create({
            title: title || 'Untitled Meeting',
            createdBy: req.user._id, // Assign the logged-in user as owner
            canvasData: canvasData || {},
            thumbnail: thumbnail || '',
        });

        res.status(201).json(meeting);
    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ message: 'Server error creating meeting' });
    }
});

// @route   PUT /api/meetings/:id
// @desc    Update a meeting (title, canvas data, thumbnail)
// @access  Private
router.put('/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Authorization check
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this meeting' });
        }

        const { title, canvasData, thumbnail } = req.body;

        // Update fields if provided
        meeting.title = title || meeting.title;
        // Check for undefined explicitly to allow empty object {} updates
        meeting.canvasData = canvasData !== undefined ? canvasData : meeting.canvasData;
        meeting.thumbnail = thumbnail !== undefined ? thumbnail : meeting.thumbnail;

        const updatedMeeting = await meeting.save();

        res.json(updatedMeeting);
    } catch (error) {
        console.error('Update meeting error:', error);
        res.status(500).json({ message: 'Server error updating meeting' });
    }
});

// @route   DELETE /api/meetings/:id
// @desc    Delete a meeting permanently
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Authorization check
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this meeting' });
        }

        await meeting.deleteOne();

        res.json({ message: 'Meeting deleted successfully' });
    } catch (error) {
        console.error('Delete meeting error:', error);
        res.status(500).json({ message: 'Server error deleting meeting' });
    }
});

export default router;
