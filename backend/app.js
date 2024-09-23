const express = require('express');
const { sequelize, initModels, Office, BlockedDate, GroupUser, Group, MeetingGroup, Meeting, Resource, RoomGroup, RoomResource, Room, Type, User, MeetingRecurrence, SpecialPermission } = require('./models');
const blockedDatesRouter = require('./routes/blockedDates');
const groupUsersRouter = require('./routes/groupUsers');
const groupsRouter = require('./routes/groups');
const meetingGroupsRouter = require('./routes/meetingGroups');
const meetingsRouter = require('./routes/meetings');
const resourcesRouter = require('./routes/resources');
const roomGroupsRouter = require('./routes/roomGroups');
const roomResourcesRouter = require('./routes/roomResources');
const roomsRouter = require('./routes/rooms');
const typesRouter = require('./routes/types');
const usersRouter = require('./routes/users');
const officeRouter = require('./routes/offices');
const specialPermissionsRouter = require('./routes/specialPermissions');
const recurrenceRouter = require('./routes/meetingrecurrences');

const app = express();

app.use(express.json());
app.use('/api/blockeddates', blockedDatesRouter);
app.use('/api/groupusers', groupUsersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/meetinggroups', meetingGroupsRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/roomgroups', roomGroupsRouter);
app.use('/api/roomresources', roomResourcesRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/types', typesRouter);
app.use('/api/users', usersRouter);
app.use('/api/locations', officeRouter);
app.use('/api/recurrences', recurrenceRouter);
app.use('/api/specialpermissions', specialPermissionsRouter);

// const retryOptions = { maxRetries: 3, delay: 100 }; // Customize retry options as needed

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connecting...');
        
        initModels(); // Initialize models and associations
        const models = ['BlockedDate', 'GroupUser', 'Group', 'MeetingGroup', 'Meeting', 'Resource', 'RoomGroup', 'RoomResource', 'Room', 'Type', 'User', 'MeetingRecurrence', 'SpecialPermission'];
        // Debugging to identify undefined models
        const modelsToSync = [
            BlockedDate,
            GroupUser,
            Group,
            MeetingGroup,
            Meeting,
            Resource,
            RoomGroup,
            RoomResource,
            Room,
            Type,
            User,
            MeetingRecurrence,
            SpecialPermission,
            // Add more models if needed
        ];

        modelsToSync.forEach((model, index) => {
            if (!model) {
                console.error(`Model at index ${index} is undefined`);
            }else{
                console.log(`Synced Model ${models[index]}`);
            }
        });

        // Synchronize all models except Office
        await Promise.all(
            modelsToSync.map((model) => model.sync({ alter: false }))
        );

        app.listen(5000, () => console.log('Server running on port 5000'));
        const cors = require('cors');
        app.use(cors());
    } catch (err) {
        console.error('Unable to connect to the database:', err);
    }
};

startServer();
