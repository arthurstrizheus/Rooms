const { RoomGroup } = require('../models');

const GetAll = async (req, res) => {
    try {
        const data = await RoomGroup.findAll();
        res.json(data);
    } catch (err) {
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error');
    }
};

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const { group_id, room_id, created_user_id } = req.body;

        // Validate the incoming data (optional but recommended)
        if (!group_id || !room_id || !created_user_id) {
            return res.status(400).json({ message: 'group_id, room_id, and created_user_id are required' });
        }

        // Create a new resource record in the database
        const newResource = await RoomGroup.create({
            group_id,
            room_id,
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
        const { group_id, room_id, created_user_id } = req.body;  // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!group_id || !room_id || !created_user_id) {
            return res.status(400).json({ message: 'group_id, room_id, and created_user_id are required' });
        }

        // Find the existing resource by ID
        const resource = await RoomGroup.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            group_id,
            room_id,
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
        const resource = await RoomGroup.findByPk(id);
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

const DeleteRoomId = async (req, res) => {
    try {
        const { group_id, room_id } = req.body;
        // Validate the incoming data (optional but recommended)
        if (!group_id || !room_id) {
            return res.status(400).json({ message: 'group_id and room_id are required' });
        }
        const resource = await RoomGroup.findOne({
            where: {
                group_id: group_id,
                room_id: room_id
            }
        });
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
    DeleteRoomId
};
