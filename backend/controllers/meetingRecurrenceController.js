const { MeetingRecurrence, Meeting, User } = require('../models');
const meetingController = require('../controllers/meetingControler');
const { Sequelize } = require('sequelize');

const IsParentMeeting = async (req, res) => {
    const {id} = req.params;
    try {
        const data = await MeetingRecurrence.findAll({where:{meeting_id:id}});
        if(data?.length){
            return res.status(200).json({ message: 'Meeting is parent recurring meeting', parent:true });
        }else{
            return res.status(200).json({ message: 'Meeting is NOT parent recurring meeting', parent:false });
        }
        
    } catch (err) {
        console.error('Error checking if meeting is parent:', err);
        res.status(500).send('Server error, checking if meeting is parent');
    }
};

const CancelAllMeetings = async (req, res) => {
    const {id} = req.params;
    try{
        const recurrence = await MeetingRecurrence.findByPk(id);
        await recurrence.update({active:false});
        const meetings = await Meeting.findAll({where:{recurrence_id: id}})
        meetings?.map(async meeting => {
            await meeting.update({
                status: 'Canceled'
            })
        });
        return res.status(200).json({ message: 'Meetings updated'});

    }catch (err){
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error, canceling recurring meetings');
    }
}

const CancelAllNextMeetings = async (req, res) => {
    const {recurrence_id} = req.params;
    const {id, start_time, end_time, room, location, type, organizer, description, repeats, name, retired, status, created_user_id } = req.body
    try{
        let canDelete = false;
        const recurrence = await MeetingRecurrence.findByPk(recurrence_id)
        const user = await User.findByPk(created_user_id);
        if(Number(id) === -1){
            const parentMeeting = await Meeting.findByPk(recurrence.meeting_id);
            canDelete = await meetingController.CanDelete(parentMeeting.id, user.id);
        }else{
            canDelete = await meetingController.CanDelete(id, user.id);
        }

        if(!canDelete) {
            return res.status(409).json({ message: 'Access Denied', delete:false });
        }
        // Create meeting if this is a recurrence meeting
        if(Number(id) === -1){
            const newResource = await Meeting.create({
                id:null,
                start_time,
                end_time,
                room,
                location,
                type,
                organizer,
                description,
                repeats,
                name,
                retired,
                status: status !== 'Approved' ? !user.admin ? meetingStatus : 'Approved' : 'Approved',
                created_user_id,
            });
            res.status(200).json(newResource);
        }
        // Disable the recurrence
        await recurrence.update({active:false});

        // Cancle all meetings after the current meeting
        const meetingTime = new Date(start_time);
        const meetings = await Meeting.findAll({
            where:{
                recurrence_id: id,
                start_time: {
                    [Sequelize.Op.gt]: meetingTime
                }

            }
        })
        meetings?.map(async meeting => {
            await meeting.update({
                status: 'Canceled'
            })
        });

    }catch (err){
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error, canceling recurring meetings');
    }
}


module.exports = {
    IsParentMeeting,
    CancelAllMeetings,
    CancelAllNextMeetings,
};
