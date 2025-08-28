const { Sequelize } = require("sequelize");
const { GroupUser, Group } = require("../models");

const GetAll = async (req, res) => {
    try {
        const location = req.query.location;
        let groups = [];
        if (location == 0 || !location) {
            groups = await Group.findAll();
        } else {
            groups = await Group.findAll({
                where: { location: location },
            });
        }
        const groupIds = groups.map((group) => group.id);
        const data = await GroupUser.findAll({
            where: { group_id: { [Sequelize.Op.in]: groupIds } },
        });
        res.json(data);
    } catch (err) {
        console.error("Error fetching room groups:", err);
        res.status(500).send("Server error");
    }
};

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const { group_id, user_id, created_user_id } = req.body;

        // Validate the incoming data (optional but recommended)
        if (!group_id || !user_id || !created_user_id) {
            return res.status(400).json({
                message: "group_id, user_id, and created_user_id are required",
            });
        }

        const group = await Group.findByPk(group_id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (group.location !== req.user.location && !req.user.admin) {
            return res.status(403).json({
                message: "You cannot add users to this group from this office.",
            });
        }

        // Create a new resource record in the database
        const newResource = await GroupUser.create({
            group_id,
            user_id,
            created_user_id,
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
        const { group_id, user_id, created_user_id } = req.body; // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!group_id || !user_id || !created_user_id) {
            return res.status(400).json({
                message: "group_id, user_id, and created_user_id are required",
            });
        }

        // Find the existing resource by ID
        const resource = await GroupUser.findByPk(id);

        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        const group = await Group.findByPk(group_id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (group.location !== req.user.location && !req.user.admin) {
            return res.status(403).json({
                message: "You cannot add users to this group from this office.",
            });
        }

        // Update the resource record in the database
        await resource.update({
            group_id,
            user_id,
            created_user_id,
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
        const resource = await GroupUser.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }
        const group = await Group.findByPk(resource.group_id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (group.location !== req.user.location && !req.user.admin) {
            return res.status(403).json({
                message:
                    "You cannot delete users from this group from this office.",
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

const DeleteByGroupId = async (req, res) => {
    try {
        const { group_id, user_id } = req.body;
        // Validate the incoming data (optional but recommended)
        if (!group_id || !user_id) {
            return res
                .status(400)
                .json({ message: "group_id and user_id are required" });
        }
        const resource = await GroupUser.findOne({
            where: {
                group_id: group_id,
                user_id: user_id,
            },
        });
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }
        const group = await Group.findByPk(group_id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (group.location !== req.user.location && !req.user.admin) {
            return res.status(403).json({
                message:
                    "You cannot delete users from this group from this office.",
            });
        }
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
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
    DeleteByGroupId,
};
