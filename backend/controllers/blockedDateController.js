const { BlockedDate } = require('../models');

const GetAll = async (req, res) => {
    try {
        const data = await BlockedDate.findAll();
        res.json(data);
    } catch (err) {
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error');
    }
};

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const { room_id, start_time, description, name, end_time, repeats, created_user_id } = req.body;

        // Validate the incoming data (optional but recommended)
        if (!room_id || !start_time || !name || !end_time || !created_user_id) {
            return res.status(400).json({ message: 'room_id, start_time, description, name, end_time, repeats, and created_user_id are required' });
        }

        // Create a new resource record in the database
        const newBlockedDate= await BlockedDate.create({
            room_id,
            start_time,
            description,
            name,
            end_time,
            repeats,
            created_user_id,
        });

        // Return the created record as a JSON response
        res.status(201).json(newBlockedDate);
    } catch (err) {
        console.error('Error creating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Update = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters
        const { room_id, start_time, description, name, end_time, repeats, created_user_id } = req.body;  // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!room_id || !start_time || !description || !name || !end_time || !repeats || !created_user_id) {
            return res.status(400).json({ message: 'value, color, and created_user_id are required' });
        }

        // Find the existing resource by ID
        const resource = await BlockedDate.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            room_id,
            start_time,
            description,
            name,
            end_time,
            repeats,
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
        const resource = await BlockedDate.findByPk(id);
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
    Delete
};
