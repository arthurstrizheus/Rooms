const express = require('express');
const router = express.Router();
const meetingRecurrenceController = require('../controllers/meetingRecurrenceController');

router.get('/isparent/:id', meetingRecurrenceController.IsParentMeeting);
router.put('cancelnext/:recurrence_id', meetingRecurrenceController.CancelAllNextMeetings);
router.delete('delete/:id', meetingRecurrenceController.CancelAllMeetings);

module.exports = router;
