const { Sequelize } = require("sequelize");
const { Room, User, GroupUser, RoomGroup } = require("../models");
const path = require("path");
const fs = require("fs");

const GetAll = async (req, res, next) => {
    try {
        const data = await Room.findAll();
        res.json(data);
    } catch (err) {
        next(err); // Pass error to the error-handling middleware
    }
};

const GetRoomsUserCanSee = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res
                .status(400)
                .json({ message: "Required fields missing: userId" });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user?.admin) {
            const rooms = await Room.findAll({
                where: { location: user.location },
            });
            return res.status(200).json(rooms);
        }
        if (user?.office_admin) {
            const rooms = await Room.findAll({
                where: { location: req.user?.office_admin },
            });
            return res.status(200).json(rooms);
        }

        const groupUsers = await GroupUser.findAll({
            where: { user_id: userId },
        });
        if (!groupUsers.length) {
            return res.status(200).json([]);
        }

        const groupIds = groupUsers.map((gu) => gu.group_id);

        const roomGroups = await RoomGroup.findAll({
            where: { group_id: groupIds },
        });
        const roomIds = roomGroups.map((rg) => rg.room_id);

        const UsersRooms = await Room.findAll({
            where: { id: { [Sequelize.Op.in]: roomIds } },
        });

        res.status(200).json(UsersRooms || []);
    } catch (err) {
        console.error("Error fetching rooms:", err); // Log the error for debugging
        res.status(500).json({
            message: "An error occurred while fetching rooms.",
        });
    }
};

const Post = async (req, res, next) => {
    try {
        const { value, location, capacity, color, created_user_id } = req.body;

        if (!value || !color || !created_user_id) {
            return res.status(400).json({
                message:
                    "Required fields missing: value, color, created_user_id",
            });
        }
        console.log(req.user?.office_admin, location, !req.user?.admin);
        if (req.user?.office_admin != location && !req.user?.admin) {
            return res.status(403).json({
                message: "Cannot create room for another office.",
            });
        }

        let imageUrl = null;
        if (req.file) {
            console.log("File uploaded:", req.file); // Debugging log for uploaded file
            imageUrl = req.file.filename; // Save only the filename
        } else {
            console.log("No file uploaded"); // Debugging log if no file is uploaded
        }

        const newRoom = await Room.create({
            value,
            location,
            capacity,
            color,
            created_user_id,
            image_url: imageUrl,
        });

        res.status(201).json(newRoom);
    } catch (err) {
        console.error("Error in Post function:", err); // Log the error
        next(err);
    }
};

const Update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { value, location, capacity, color, created_user_id } = req.body;

        if (!value || !color || !created_user_id) {
            return res.status(400).json({
                message:
                    "Required fields missing: value, color, created_user_id",
            });
        }
        if (req.user?.office_admin != location && !req.user?.admin) {
            return res.status(403).json({
                message: "Cannot update room for another office.",
            });
        }

        const room = await Room.findByPk(id);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        let updatedImageUrl = room.image_url;

        // Handle new image upload or deletion
        if (req.file) {
            console.log("File uploaded for update:", req.file); // Debugging log for uploaded file
            if (updatedImageUrl) {
                const oldImagePath = path.join(
                    __dirname,
                    "..",
                    "..",
                    "uploads",
                    updatedImageUrl
                );
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            updatedImageUrl = req.file.filename; // Save only the filename
        } else if (!req.body.room_image && updatedImageUrl) {
            const oldImagePath = path.join(
                __dirname,
                "..",
                "..",
                "uploads",
                updatedImageUrl
            );
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
            updatedImageUrl = null;
        } else {
            console.log("No file uploaded and no changes to image"); // Debugging log for no changes
        }

        await room.update({
            value,
            location,
            capacity,
            color,
            created_user_id,
            image_url: updatedImageUrl,
        });

        res.status(200).json(room);
    } catch (err) {
        console.error("Error in Update function:", err); // Log the error
        next(err);
    }
};

const Delete = async (req, res, next) => {
    try {
        const { id } = req.params;

        const room = await Room.findByPk(id);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }
        if (req.user?.office_admin != room.location && !req.user?.admin) {
            return res.status(403).json({
                message: "Cannot delete room for another office.",
            });
        }

        if (room.image_url) {
            const imagePath = path.join(__dirname, "..", "..", room.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await room.destroy();
        res.status(200).json({ message: "Room deleted successfully" });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    GetAll,
    Post,
    Update,
    Delete,
    GetRoomsUserCanSee,
};
