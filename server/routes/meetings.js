import express from 'express';
import Meeting from '../models/Meeting.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
// @route   GET /api/meetings/public/:id
// @desc    Get a single meeting by ID (Public access check)
// @access  Public (if meeting allows guests)
router.get('/public/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check if meeting allows guests
        if (!meeting.allowGuests) {
            return res.status(403).json({ message: 'Guests are not allowed in this meeting' });
        }

        // Return only necessary info for guests
        res.json({
            _id: meeting._id,
            title: meeting.title,
            createdBy: meeting.createdBy, // Or populate name if needed
            allowGuests: meeting.allowGuests,
            canvasData: meeting.canvasData, // Needed for initial state
            // Don't leak sensitive info
        });
    } catch (error) {
        console.error('Get public meeting error:', error);
        res.status(500).json({ message: 'Server error fetching meeting' });
    }
});

// All routes after this are protected
router.use(protect);

// @route   GET /api/meetings
// @desc    Get all meetings for the logged-in user
// @access  Private
router.get('/', async (req, res) => {
    try {
        const meetings = await Meeting.find({ createdBy: req.user._id })
            .sort({ updatedAt: -1 })
            .select('-canvasData'); // Exclude canvas data for list view

        res.json(meetings);
    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ message: 'Server error fetching meetings' });
    }
});

// @route   GET /api/meetings/:id
// @desc    Get a single meeting by ID
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check if user owns this meeting
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
            createdBy: req.user._id,
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
// @desc    Update a meeting
// @access  Private
router.put('/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check if user owns this meeting
        if (meeting.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this meeting' });
        }

        const { title, canvasData, thumbnail } = req.body;

        meeting.title = title || meeting.title;
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
// @desc    Delete a meeting
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Check if user owns this meeting
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
