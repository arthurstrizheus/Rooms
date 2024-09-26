const { SpecialPermission, MeetingRecurrence } = require('../models');
const { CanDelete } = require('./meetingControler');

const GetAll = async (req, res) => {
    try {
        const data = await SpecialPermission.findAll();
        res.json(data);
    } catch (err) {
        console.error('Error fetching special permissions:', err);
        res.status(500).send('Server error');
    }
};
const GetAllForUser = async (req, res) => {
    const {userId} = req.params;
    try {
        const data = await SpecialPermission.findAll({where:{user_id:userId}});
        res.json(data);
    } catch (err) {
        console.error('Error fetching users special permissions:', err);
        res.status(500).send('Server error');
    }
};

const GetAllForMeeting = async (req, res) => {
    const {id, recurrence_id} = req.body;
    try {
        let meetingId = id;
        if(meetingId === -1){
            const recurance = await MeetingRecurrence.findByPk(recurrence_id);
            meetingId = recurance.meeting_id;
        }
        const data = await SpecialPermission.findAll({where:{meeting_id:meetingId}});
        if(data?.length > 0){
            const userIds = data?.map(itm => itm.user_id);
            res.json([...new Set(userIds)]);
        }else{
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching meeting special users:', err);
        res.status(500).send('Server error');
    }
};

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const { user_id, meeting_id, created_user_id } = req.body;
        // Validate the incoming data (optional but recommended)
        if (!user_id || !meeting_id || !created_user_id) {
            return res.status(400).json({ message: 'user_id, resource_id, and created_user_id are required' });
        }
        const canDelete = await CanDelete(meeting_id, created_user_id);

        if(!canDelete) {
            return res.status(409).json({ message: 'Access Denied', update:false });
        }

        // Create a new resource record in the database
        const newResource = await SpecialPermission.create({
            user_id,
            meeting_id,
            created_user_id,
        });

        // Return the created record as a JSON response
        res.status(201).json(newResource);
    } catch (err) {
        console.error('Error creating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Update = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters
        const { user_id, meeting_id, created_user_id } = req.body;  // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!user_id || !meeting_id || !created_user_id) {
            return res.status(400).json({ message: 'user_id, meeting_id, and created_user_id are required' });
        }

        // Find the existing resource by ID
        const resource = await SpecialPermission.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            user_id,
            meeting_id,
            created_user_id,
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Delete = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters

        // Find the existing resource by ID
        const resource = await SpecialPermission.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Delete the resource record from the database
        await resource.destroy();

        // Return a success message
        res.status(200).json({ message: 'Resource deleted successfully' });
    } catch (err) {
        console.error('Error deleting resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = {
    GetAll,
    Post,
    Update,
    Delete,
    GetAllForUser,
    GetAllForMeeting,
};
