const { sequelize } = require('../config/database');
const BlockedDate = require('./blockedDate');
const Group = require('./group');
const GroupUser = require('./groupUser');
const Meeting = require('./meeting');
const MeetingGroup = require('./meetingGroup');
const Resource = require('./resource');
const Room = require('./room');
const RoomGroup = require('./roomGroup');
const RoomResource = require('./roomResource');
const Type = require('./type');
const Office = require('./office');
const User = require('./user');
const MeetingRecurrence = require('./meetingRecurrence');
const SpecialPermission = require('./specialPermission');

const initModels = () => {
    // Define associations here if needed
    // Example: RoomGroup.hasMany(OtherModel);
    const Group = require('./group');
    const GroupUser = require('./groupUser');
    const MeetingGroup = require('./meetingGroup');
    const Resource = require('./resource');
    const Room = require('./room');
    const RoomGroup = require('./roomGroup');
    const RoomResource = require('./roomResource');
    const User = require('./user');
    const SpecialPermission = require('./specialPermission');

    User.hasMany(SpecialPermission, {
        foreignKey: 'user_id',
        onDelete: 'CASCADE',
    })
    SpecialPermission.belongsTo(User, {
        foreignKey: 'user_id',
        onDelete: 'CASCADE',
    })

    Meeting.hasMany(SpecialPermission, {
        foreignKey: 'meeting_id',
        onDelete: 'CASCADE',
    })
    SpecialPermission.belongsTo(Meeting, {
        foreignKey: 'meeting_id',
        onDelete: 'CASCADE',
    })

    Resource.hasMany(RoomResource, {
        foreignKey: 'resource_id',
        onDelete: 'CASCADE',
    })
    RoomResource.belongsTo(Resource, {
        foreignKey: 'resource_id',
        onDelete: 'CASCADE',
    })

    Group.hasMany(GroupUser, {
        foreignKey: 'group_id',
        onDelete: 'CASCADE',
    })
    Group.hasMany(MeetingGroup, {
        foreignKey: 'group_id',
        onDelete: 'CASCADE',
    })
    Group.hasMany(RoomGroup, {
        foreignKey: 'group_id',
        onDelete: 'CASCADE',
    })

    GroupUser.belongsTo(Group, {
        foreignKey: 'group_id',
        onDelete: 'CASCADE',
    })
    MeetingGroup.belongsTo(Group, {
        foreignKey: 'group_id',
        onDelete: 'CASCADE',
    })
    RoomGroup.belongsTo(Group, {
        foreignKey: 'group_id',
        onDelete: 'CASCADE',
    })

    User.hasMany(GroupUser, {
        foreignKey: 'user_id',
        onDelete: 'CASCADE',
    })
    GroupUser.belongsTo(User, {
        foreignKey: 'user_id',
        onDelete: 'CASCADE',
    })

    Room.hasMany(RoomResource, {
        foreignKey: 'room_id',
        onDelete: 'CASCADE',
    })
    RoomResource.belongsTo(Room, {
        foreignKey: 'room_id',
        onDelete: 'CASCADE',
    })

    Room.hasMany(RoomGroup, {
        foreignKey: 'room_id',
        onDelete: 'CASCADE',
    })
    RoomGroup.belongsTo(Room, {
        foreignKey: 'room_id',
        onDelete: 'CASCADE',
    })

    Office.hasMany(Group, {
        foreignKey: 'location',
        onDelete: 'CASCADE',
    })
    Group.belongsTo(Office, {
        foreignKey: 'location',
        onDelete: 'CASCADE',
    })

    MeetingGroup.belongsTo(Meeting, {
        foreignKey: 'meeting_id',
        onDelete: 'CASCADE',
    })
    Meeting.hasMany(MeetingGroup, {
        foreignKey: 'meeting_id',
        onDelete: 'CASCADE',
    })
    MeetingRecurrence.belongsTo(Meeting, {
        foreignKey: 'meeting_id',
        onDelete: 'CASCADE',
    })
    Meeting.hasMany(MeetingRecurrence, {
        foreignKey: 'meeting_id',
        onDelete: 'CASCADE',
    })
};

module.exports = {
    sequelize,
    BlockedDate,
    Group,
    GroupUser,
    Meeting,
    MeetingGroup,
    Resource,
    Room,
    RoomGroup,
    RoomResource,
    Type,
    Office,
    User,
    MeetingRecurrence,
    SpecialPermission,
    initModels,
};
