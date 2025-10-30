const {
    Resource,
    RoomResource,
    User,
    Room,
    Group,
    RoomGroup,
    GroupUser,
} = require("../models");
const { Sequelize } = require("sequelize");

const GetAll = async (req, res) => {
    try {
        const { equipment } = req.query;
        let data = [];
        if (equipment === "true") {
            data = await Resource.findAll({ where: { equipment: true } });
        } else if (equipment === "false") {
            data = await Resource.findAll({ where: { equipment: false } });
        } else {
            data = await Resource.findAll();
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error("Error fetching room groups:", err);
        res.status(500).send("Server error");
    }
};

const GetAllUserCanSee = async (req, res) => {
    try {
        const { equipment } = req.query;
        let data = [];
        if (equipment === "true") {
            data = await Resource.findAll({ where: { equipment: true } });
        } else if (equipment === "false") {
            data = await Resource.findAll({ where: { equipment: false } });
        } else {
            data = await Resource.findAll();
        }
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const allGroups = await Group.findAll({
            where: { group_name: "All SEA Staff" },
        });
        const allIds = allGroups.map((gp) => gp.id);
        const allRoomGroups = await RoomGroup.findAll({
            where: { group_id: { [Sequelize.Op.in]: allIds } },
        });
        const roomsWithAll = allRoomGroups.map((rg) => rg.room_id);

        if (user?.admin) {
            const rooms = await Room.findAll();
            return res.status(200).json(rooms);
        }
        if (user?.office_admin) {
            const rooms = await Room.findAll({
                where: {
                    [Sequelize.Op.or]: [
                        { location: user.office_admin },
                        { id: { [Sequelize.Op.in]: roomsWithAll } },
                    ],
                },
            });
            return res.status(200).json(rooms);
        }

        const groupUsers = await GroupUser.findAll({
            where: { user_id: req.user.id },
        });
        if (!groupUsers.length) {
            return res.status(200).json([]);
        }

        const groupIds = groupUsers.map((gu) => gu.group_id);

        const roomGroups = await RoomGroup.findAll({
            where: { group_id: groupIds },
        });
        const roomIds = roomGroups.map((rg) => rg.room_id);

        // Now get all resources that are assigned to rooms.
        const roomResources = await RoomResource.findAll({
            where: { room_id: { [Sequelize.Op.in]: roomIds } },
            attributes: ["resource_id"],
            raw: true,
        });
        const resourceIds = roomResources.map((rr) => rr.resource_id);

        return res.json(data?.filter((res) => resourceIds.includes(res.id)));
    } catch (err) {
        console.error("Error fetching resources:", err);
        res.status(500).send("Server error");
    }
};

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const { name, location, created_user_id, equipment } = req.body;

        // Validate the incoming data (optional but recommended)
        if (!name || !location || !created_user_id) {
            return res.status(400).json({
                message: "value, color, and created_user_id are required",
            });
        }

        if (req.user?.office_admin != location && !req.user?.admin) {
            return res.status(403).json({
                message: "Cannot create resources in another office.",
            });
        }

        // Create a new resource record in the database
        const newResource = await Resource.create({
            name,
            location,
            created_user_id,
            equipment: equipment || false, // Default to false if not provided
        });

        // Return the created record as a JSON response
        res.status(201).json(newResource);
    } catch (err) {
        console.error("Error creating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const Update = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters
        const { name, location, created_user_id, equipment } = req.body; // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!name || !location || !created_user_id) {
            return res.status(400).json({
                message: "value, color, and created_user_id are required",
            });
        }

        // Find the existing resource by ID
        const resource = await Resource.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }
        if (req.user?.office_admin != resource.location && !req.user?.admin) {
            return res.status(403).json({
                message: "Cannot modify resources from another office.",
            });
        }

        // Update the resource record in the database
        await resource.update({
            name,
            location,
            created_user_id,
            equipment: equipment || false, // Default to false if not provided
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const Delete = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters

        // Find the existing resource by ID
        const resource = await Resource.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }
        if (req.user?.office_admin != resource.location && !req.user?.admin) {
            return res.status(403).json({
                message: "Cannot delete resources from another office.",
            });
        }
        const RoomResources = await RoomResource.findOne({
            where: { resource_id: id },
        });
        if (RoomResources) {
            return res.status(400).json({
                message: "Cannot delete resource assigned to a room.",
            });
        }

        // Delete the resource record from the database
        await resource.destroy();

        // Return a success message
        res.status(200).json({ message: "Resource deleted successfully" });
    } catch (err) {
        console.error("Error deleting resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    GetAll,
    Post,
    Update,
    Delete,
    GetAllUserCanSee,
};
