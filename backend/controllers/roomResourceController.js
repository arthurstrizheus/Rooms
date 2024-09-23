const { Sequelize } = require('sequelize');
const { RoomResource, Resource } = require('../models');

const GetAll = async (req, res) => {
    try {
        const data = await RoomResource.findAll();
        res.json(data);
    } catch (err) {
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error');
    }
};

const GetAllForRoom = async (req, res) => {
    const { roomId } = req.params;
    try {
        // Fetch all RoomResource entries related to the roomId
        const data = await RoomResource.findAll({ where: { room_id: roomId } });
        
        // Extract resource IDs and log them to ensure they are correct
        const resourceIds = data.map(rc => rc.resource_id);
        
        // Check if resourceIds is an array and contains valid values
        if (!Array.isArray(resourceIds) || !resourceIds.length) {
            return [];
        }

        // Fetch resources with the corresponding resource IDs
        const resources = await Resource.findAll({
            where: {
                id: {
                    [Sequelize.Op.in]: resourceIds // Ensure it's an array of IDs
                }
            }
        });

        res.json(resources);
    } catch (err) {
        console.error('Error fetching room resources:', err);
        res.status(500).send('Server error');
    }
};

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const { room_id, resource_id, created_user_id } = req.body;

        // Validate the incoming data (optional but recommended)
        if (!room_id || !resource_id || !created_user_id) {
            return res.status(400).json({ message: 'room_id, resource_id, and created_user_id are required' });
        }
        // Create a new resource record in the database
        const newResource = await RoomResource.create({
            room_id,
            resource_id,
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
        const { room_id, resource_id, created_user_id } = req.body;  // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!room_id || !resource_id || !created_user_id) {
            return res.status(400).json({ message: 'room_id, resource_id, and created_user_id are required' });
        }

        // Find the existing resource by ID
        const resource = await RoomResource.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            room_id,
            resource_id,
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
        const resource = await RoomResource.findByPk(id);
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
    GetAllForRoom
};
