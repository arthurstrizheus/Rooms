const { Meeting, GroupUser, RoomGroup, Group, User, MeetingGroup, MeetingRecurrence, SpecialPermission } = require('../models');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

async function GetNextParentMeeting(userId, meeting){
    const meetings = await Meeting.findAll({where:{recurrence_id: meeting.recurrence_id}});
    
    // Find the next parent meeting
    const fakeMeets = await CreateRepeatingMeetings(meeting.start_time, "Month", userId);
    let nextDate = new Date(meeting.start_time);
    
    switch(meeting.repeats) {
        case 'Daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'Weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'Monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'Yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            throw new Error('Invalid range');
    }
    fakeMeets?.map(fm => console.log({start:fm.start_time, equal: fm.start_time === nextDate.toISOString()}));

    console.log('Next Date', nextDate);
    let nextParentMeet = fakeMeets?.find(fm => fm.start_time === nextDate.toISOString());
    console.log('Next parent', nextParentMeet);
    if(meetings?.length){
        const MeetingExists = meetings?.find(mt => mt.toJSON()?.start_time == nextParentMeet.start_time && mt.toJSON()?.end_time == nextParentMeet.end_time && mt.toJSON()?.recurrence_id == nextParentMeet.recurrence_id);
        if(MeetingExists){
            return MeetingExists;
        }
    }
    
    if(!nextParentMeet){
        return null;
    }
    return nextParentMeet;
    
}

async function CanSeeMeet(roomId, user) {
    if(user.admin){
        return true;
    }

    // Fetch all groups the user belongs to
    const groupUsers = await GroupUser.findAll({ where: { user_id: id } });

    // If the user is not part of any group, return an empty array
    if (!groupUsers.length) {
        return res.status(200).json([]);
    }

    // Extract group IDs the user belongs to
    const groupIds = groupUsers?.map(gu => gu.group_id);

    // Find all room groups that match the user's group memberships
    const roomGroups = await RoomGroup.findAll({
        where: {
            group_id: groupIds,
        }
    });

    // Extract room IDs from the RoomGroup associations
    let roomIds = roomGroups?.map(rg => rg.room_id);

    // Find all meetings where the room is part of the rooms the user can access
    return roomIds.includes(roomId);
}

async function isOverlapping(meet) {
    // Fetch meetings in the same room
    const meetings = await Meeting.findAll({
        where: {
            room: meet.room,
            status: {
                [Sequelize.Op.in]: ['Approved', 'Waiting on Approval'] // Filter by status
            }
        }
    });

    const newStartTime = new Date(meet.start_time);
    const newEndTime = new Date(meet.end_time);

    // Check for overlapping meetings
    const isOverlapping = meetings.some(meeting => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        // Return true if there is an overlap
        return (newStartTime < meetingEnd && newEndTime > meetingStart);
    });

    return isOverlapping; // Return true if overlap is found, false otherwise
}

async function isOverlappingFakeMeet(meet) {
    // Fetch meetings in the same room
    const meetings = await Meeting.findAll({
        where: {
            room: meet.room,
        }
    });

    const newStartTime = new Date(meet.start_time);
    const newEndTime = new Date(meet.end_time);

    // Check for overlapping meetings
    const isOverlapping = meetings.some(meeting => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);

        let isOverlap = meeting.recurrence_id === meet.recurrence_id;

        // Return true if there is an overlap
        return (newStartTime < meetingEnd && newEndTime > meetingStart && isOverlap);
    });

    return isOverlapping; // Return true if overlap is found, false otherwise
}

async function isOverlappingFakeMeetUpdate(meet) {
    // Fetch meetings in the same room
    const meetings = await Meeting.findAll({
        where: {
            room: meet.room,
        }
    });

    const newStartTime = new Date(meet.start_time);
    const newEndTime = new Date(meet.end_time);

    // Check for overlapping meetings
    const isOverlapping = meetings.some(meeting => {
        const meetingStart = new Date(meeting.start_time);
        const meetingEnd = new Date(meeting.end_time);
        
        if(meeting.recurrence_id === meet.recurrence_id){return false;}
        let isOverlap = newStartTime < meetingEnd && newEndTime > meetingStart;
        // Return true if there is an overlap
        return (isOverlap);
    });

    return isOverlapping; // Return true if overlap is found, false otherwise
}

async function CreateRepeatingMeetingsOfThisMeeting(meeting, userId, currentDate){
    // Check 1 year ahead
    let extension = new Date(new Date(currentDate).getFullYear() + 1);

    let meetings = [];
    let currentStartTime = new Date(meeting.start_time);
    let currentEndTime = new Date(meeting.end_time);

    while (currentStartTime <= extension) {
        // Increment dates based on recurrence
        if (meeting.repeats === 'Daily') {
            currentStartTime.setDate(currentStartTime.getDate() + 1);
            currentEndTime.setDate(currentEndTime.getDate() + 1);
        } else if (meeting.repeats === 'Weekly') {
            currentStartTime.setDate(currentStartTime.getDate() + 7);
            currentEndTime.setDate(currentEndTime.getDate() + 7);
        } else if (meeting.repeats === 'Monthly') {
            currentStartTime.setMonth(currentStartTime.getMonth() + 1);
            currentEndTime.setMonth(currentEndTime.getMonth() + 1);
        } else if (meeting.repeats === 'Yearly') {
            currentStartTime.setFullYear(currentStartTime.getFullYear() + 1);
            currentEndTime.setFullYear(currentEndTime.getFullYear() + 1);
        }

        const fakeMeet = {
            ...meeting.toJSON(),
            id: -1,  // Fake meeting ID
            start_time: currentStartTime.toISOString(),
            end_time: currentEndTime.toISOString(),
            recurrence_id: meeting.recurrence_id
        };

        // Only push non-overlapping fake meetings
        // console.log('New Fake Meet', fakeMeet);
        const createFakeMeet = await isOverlappingFakeMeet(fakeMeet);
        if (!createFakeMeet) {
            meetings.push(fakeMeet);
        }
    }
    
    meetings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    return meetings;
}

async function CreateRepeatingMeetings(currentDate, range, userId) {
    const user = await User.findByPk(userId);

    const latestMeetings = await Meeting.findAll({
        attributes: [
            'recurrence_id',
            [Sequelize.fn('MAX', Sequelize.col('start_time')), 'latest_start_time']
        ],
        where: {
            recurrence_id: {
                [Sequelize.Op.not]: null
            },
            status: {
                [Sequelize.Op.notIn]: ['Canceled', 'Waiting on Approval']
            }
        },
        group: ['recurrence_id']
    });

    const recurrenceData = latestMeetings?.map(meet => ({
        recurrence_id: meet.recurrence_id,
        latest_start_time: meet.getDataValue('latest_start_time')
    })).filter(m => m.recurrence_id !== null && m.latest_start_time !== null);
    

    if (recurrenceData.length === 0) {
        return []; // No recurring meetings found, return empty array
    }
    const recurrenceIds = recurrenceData?.map(m => m.recurrence_id);

    const latestStartTimes = recurrenceData?.map(m => m.latest_start_time);


    const meetingsWithRecurrence = await Meeting.findAll({
        where: {
            [Sequelize.Op.and]: [
                { recurrence_id: { [Sequelize.Op.in]: recurrenceIds } },
                { start_time: { [Sequelize.Op.in]: latestStartTimes } }
            ]
        },
        order: [['start_time', 'DESC']]
    });
    
    // console.log('meetingsWithRecurrence', meetingsWithRecurrence?.length, meetingsWithRecurrence[0].id);
    let extension = new Date(currentDate);

    // Define how far into the future we want to generate meetings
    switch(range) {
        case 'Day':
            extension.setDate(extension.getDate() + 1);
            break;
        case 'Week':
            extension.setDate(extension.getDate() + 7);
            break;
        case 'Month':
            extension.setMonth(extension.getMonth() + 2);
            break;
        case 'Year':
            extension.setFullYear(extension.getFullYear() + 1);
            break;
        default:
            throw new Error('Invalid range');
    }

    let meetings = [];

    for (let meeting of meetingsWithRecurrence) {
        // User special permissions
        const special = await SpecialPermission.findAll({where:{user_id:id}});
        const meetingIds = special?.map(sp => sp.meeting_id);
        const meetingsUserHasSpecialAccess = await Meeting.findAll({
            where:{
                id:{
                    [Sequelize.Op.In]: meetingIds,
                },
                status: 'Approved'
            }
        });
        const meetIds = meetingsUserHasSpecialAccess?.map(mt => mt.id);

        if(!CanSeeMeet(meeting, user) && !meetIds.includes(meeting.id)) continue; // Skip if user cannot see this meeting
        if(meeting.status === 'Canceled') continue;
        const recurrence = await MeetingRecurrence.findByPk(meeting.recurrence_id);
        if (!recurrence || !recurrence?.active) continue;  // Skip if no recurrence exists

        let currentStartTime = new Date(meeting.start_time);
        let currentEndTime = new Date(meeting.end_time);

        while (currentStartTime <= extension) {
            // Increment dates based on recurrence
            if (recurrence.frequency === 'Daily') {
                currentStartTime.setDate(currentStartTime.getDate() + 1);
                currentEndTime.setDate(currentEndTime.getDate() + 1);
            } else if (recurrence.frequency === 'Weekly') {
                currentStartTime.setDate(currentStartTime.getDate() + 7);
                currentEndTime.setDate(currentEndTime.getDate() + 7);
            } else if (recurrence.frequency === 'Monthly') {
                currentStartTime.setMonth(currentStartTime.getMonth() + 1);
                currentEndTime.setMonth(currentEndTime.getMonth() + 1);
            } else if (recurrence.frequency === 'Yearly') {
                currentStartTime.setFullYear(currentStartTime.getFullYear() + 1);
                currentEndTime.setFullYear(currentEndTime.getFullYear() + 1);
            }
            // Stop creating meetings if we are past the end date
            if(recurrence.repeat_until != null && currentStartTime > new Date(recurrence.repeat_until)){break;}

            currentStartTime.setHours(new Date(meeting.start_time).getHours());
            currentStartTime.setMinutes(new Date(meeting.start_time).getMinutes());
            currentEndTime.setHours(new Date(meeting.end_time).getHours());
            currentEndTime.setMinutes(new Date(meeting.end_time).getMinutes());
            
            const fakeMeet = {
                ...meeting.toJSON(),
                id: -1,  // Fake meeting ID
                start_time: currentStartTime.toISOString(),
                end_time: currentEndTime.toISOString(),
                recurrence_id: meeting.recurrence_id
            };

            // Only push non-overlapping fake meetings
            // console.log('New Fake Meet', fakeMeet);
            const createFakeMeet = await isOverlappingFakeMeet(fakeMeet);
            if (!createFakeMeet) {
                meetings.push(fakeMeet);
            }
        }
    }
    meetings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    return meetings;
}

async function GetMeetingStatus (roomId, userId){
    // Fetch all groups the user belongs to
    const groupUsers = await GroupUser.findAll({ where: { user_id: userId } });
    // If the user is not part of any group, return an empty array
    if (!groupUsers.length) {
        return 'Waiting on Approval';
    }

    // Extract group IDs the user belongs to
    const groupIds = groupUsers?.map(gu => gu.group_id);

    // Find all the groups that the user has full access in
    const groups = await Group.findAll({
        where: {
            id: {
                [Sequelize.Op.in]: groupIds // Fix: Ensure that `groupIds` is an array of integers
            },
            access: 'Full'
        }
    });
    const fullAccessGroups = groups?.map(gu => gu.id);

    // Find all room groups that match the user's group memberships of Full access
    const roomGroups = await RoomGroup.findAll({
        where: {
            group_id:{
                [Sequelize.Op.in]: fullAccessGroups
            },
        }
    });
    

    // Extract room IDs from the RoomGroup associations
    const roomIds = roomGroups?.map(rg => rg.room_id);
    
    return roomIds.includes(roomId) ? 'Approved' : 'Waiting on Approval';
}

const SetStatus = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters
        const { status, userId, meeting } = req.body;  // Extract data from the request body
        let canDelete = false;

        // Validate the incoming data (optional but recommended)
        if (!status) {
            return res.status(400).json({ message: 'Required fields missing' });
        }
        if(Number(id) === -1){
            const recurrence = await MeetingRecurrence.findByPk(meeting.recurrence_id)
            const parentMeeting = await Meeting.findByPk(recurrence.meeting_id);

            canDelete = await CanDelete(parentMeeting.id, userId);
        }else{
            canDelete = await CanDelete(id, userId);
        }

        if(!canDelete) {
            return res.status(409).json({ message: 'Access Denied', delete:false });
        }
        // Create meeting if this is a recurrence meeting
        if(Number(id) === -1){
            const newResource = await Meeting.create({
                ...meeting,
                id:null,
                status: status,
            });
            res.status(200).json(newResource);
        }else{
            // Find the existing resource by ID
            const resource = await Meeting.findByPk(id);
            if (!resource) {
                return res.status(404).json({ message: 'Resource not found' });
            }

            // Check if this is a parent meeting that is being updated
            const recurrence = await MeetingRecurrence.findOne({where:{meeting_id: id}});

            if(recurrence && status != 'Declined' && status == 'Canceled'){
                // Update to new ParentMeeting
                const newParent = await GetNextParentMeeting(userId, resource);
                if(newParent == null){
                    res.status(500).json({ message: 'Server error, Failed to find new parent meeting.' });
                }

                if(newParent.id === -1){
                    console.log('Create new Parent');
                    const newMeeting = await Meeting.create({
                        ...newParent,
                        id:null
                    });

                    await recurrence.update({meeting_id: newMeeting.id});
                }else{

                    await recurrence.update({meeting_id: newParent.id});
                }  
            }else if(recurrence && status == 'Declined'){

                await recurrence.update({active: false});
            }
            // Update the resource record in the database

            await resource.update({
                status,
            });
            // Return the updated record as a JSON response
            res.status(200).json(resource);
        }
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

async function CanDelete(meetingId, userId){
    const meeting = await Meeting.findByPk(Number(meetingId));
    // If user created it they can delete it
    if(meeting.created_user_id === userId){return true;}
    const user = await User.findByPk(userId);
    if(user.admin){return true;}

    // Get all groups the meeting is in via the room its in
    const meetingRoomGroups = await RoomGroup.findAll({where:{room_id: meeting.room}});
    let meetingRoomGroupIds = meetingRoomGroups?.map(mg => mg.group_id);
    
    // Get all the groups the meeting is in, ia special permissions
    const meetingGroups = await MeetingGroup.findAll({where:{meeting_id: Number(meetingId)}});
    meetingGroups?.map(mg => meetingRoomGroupIds.push(mg.group_id));

    console.log('meetingGroupIds', meetingRoomGroupIds);
    // Get all groups the user in along with it bein in the meeting groups
    const userGroups = await GroupUser.findAll({
        where:
            {
                user_id: Number(userId),
                group_id:{
                    [Sequelize.Op.in]: meetingRoomGroupIds
                }
            }
    });
    const userGroupIds = userGroups?.map(ug => ug.group_id);
    console.log('UserGroupsIds', userGroupIds);
    // Find at least 1 group that the user is that has full access
    const fullAccessGroup = await Group.findOne({
        where:
        {
            id: userGroupIds,
            access: 'Full'
        }
    })
    if(fullAccessGroup?.id){
        return true;
    }
    return false;
}

async function CanUserBook(roomId, userId){
    const user = await User.findByPk(userId);
    if(user.admin){return true;}

    // Get all groups the meeting is in via the room its in
    const meetingRoomGroups = await RoomGroup.findAll({where:{room_id: roomId}});
    let meetingRoomGroupIds = meetingRoomGroups?.map(mg => mg.group_id);

    // Get all groups the user in along with it bein in the meeting groups
    const userGroups = await GroupUser.findAll({
        where:
            {
                user_id: Number(userId),
                group_id:{
                    [Sequelize.Op.in]: meetingRoomGroupIds
                }
            }
    });
    const userGroupIds = userGroups?.map(ug => ug.group_id);

    // Find at least 1 group that the user is that has full access
    const fullAccessGroup = await Group.findOne({
        where:
        {
            id: userGroupIds,
            access: {
                [Sequelize.Op.in]: ['Full', 'Read']
            }
        }
    })
    if(fullAccessGroup?.id){
        return true;
    }
}

const GetAll = async (req, res) => {
    try {
        const data = await Meeting.findAll();
        res.json(data);
    } catch (err) {
        console.error('Error fetching meetings:', err);
        res.status(500).send('Server error: Error fetching meetings');
    }
};

const GetAllUserCreated = async (req, res) => {
    try {
        const { id } = req.params;
        // Date: DateTime - start date, Range: 'day', 'week', 'month'
        const {date, range} = req.query; 

        if (!date || !range) {
            return res.status(400).json({ message: 'Required fields missing, date and range (\'Day\', \'Week\'. \'Month\')' });
        }
        const fakeMeets = await CreateRepeatingMeetings(date, range, id); // Create repeating meetings if they do not exist, only the next 30 from the date

        // Correct way to use order
        let data = await Meeting.findAll({
            where: { created_user_id: id },
            order: [['createdAt', 'DESC']]  // Order by 'createdAt' field in ascending order
        });
        if(fakeMeets?.length > 0){
            fakeMeets?.map(fm => data.push(fm));
        }
        res.json(data);
    } catch (err) {
        console.error('Error fetching meetings:', err);
        res.status(500).send('Server error: Error fetching meetings');
    }
};

const GetAllUserCanSee = async (req, res) => {
    try {
        const { id } = req.params; // User ID
        const {date, range} = req.query; 
        if (!date || !range) {
            return res.status(400).json({ message: 'Required fields missing, date and range (\'Day\', \'Week\'. \'Month\')' });
        }

        const fakeMeets = await CreateRepeatingMeetings(date, range, id); // Create repeating meetings if they do not exist, only the next 30 from the date

        // If user is admin return all meetings
        const user = await User.findByPk(id);
        if(user.admin){
            let meets = await Meeting.findAll({
                where: {
                    location: user.location,
                    status: 'Approved'
                }
            });
            // console.log('fake meets',fakeMeets.length);
            if(fakeMeets?.length > 0){
                fakeMeets?.map(fm => meets.push(fm));
            }
            return res.status(200).json(meets);
        }

        // Fetch all groups the user belongs to
        const groupUsers = await GroupUser.findAll({ where: { user_id: id } });

        // Now check if user has any special permissions
        const special = await SpecialPermission.findAll({where:{user_id:id}});
        const meetingIds = special?.map(sp => sp.meeting_id);
        const meetingsUserHasSpecialAccess = await Meeting.findAll({
            where:{
                id:{
                    [Sequelize.Op.in]: meetingIds,
                },
                status: 'Approved'
            }
        });

        // If the user is not part of any group, return an empty array
        if (!groupUsers.length && meetingsUserHasSpecialAccess?.length == 0) {
            return res.status(200).json([]);
        }

        // Extract group IDs the user belongs to
        const groupIds = groupUsers?.map(gu => gu.group_id);

        // Find all room groups that match the user's group memberships
        const roomGroups = await RoomGroup.findAll({
            where: {
                group_id: groupIds,
            }
        });

        // Extract room IDs from the RoomGroup associations
        let roomIds = roomGroups?.map(rg => rg.room_id);

        // Find all meetings where the room is part of the rooms the user can access
        let meetings = await Meeting.findAll({
            where: {
                room: roomIds,
                status: 'Approved'
            }
        });
        if(fakeMeets?.length > 0){
            fakeMeets?.map(fm => {
                if(!meetings?.find(mt => mt.id == fm.id)){
                    meetings.push(fm);
                }
            });
        }
        if(meetingsUserHasSpecialAccess?.length > 0){
            meetingsUserHasSpecialAccess?.map(mt => {
                if(!meetings?.find(m => m.id == mt.id)){
                    meetings.push(mt);
                }
            });
        }
        // console.log('fake meets',fakeMeets.length)

        // Return the filtered meetings the user can see
        return res.status(200).json(meetings);
    } catch (err) {
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error');
    }
};

const GetAllNeedsApproval = async (req, res) => {
    try {
        const { id } = req.params; // User ID

        // If user is admin return all meetings
        const user = await User.findByPk(id);
        if(user.admin){
            const meets = await Meeting.findAll({
                where: {
                    location: user.location,
                    status: 'Waiting on Approval'
                }
            });
            return res.status(200).json(meets);
        }

        // Fetch all groups the user belongs to
        const groupUsers = await GroupUser.findAll({ where: { user_id: Number(id) } });

        // If the user is not part of any group, return an empty array
        if (!groupUsers.length) {
            return res.status(200).json([]);
        }

        // Extract group IDs the user belongs to
        const groupIds = groupUsers?.map(gu => gu.group_id);

        // Find all the groups that the user has full access in
        const groups = await Group.findAll({
            where: {
                id: groupIds,
                access: 'Full'
            }
        });
        const fullAccessGroups = groups?.map(gu => gu.id);

        if(fullAccessGroups?.length){
            // Find all room groups that match the user's group memberships of Full access
            const roomGroups = await RoomGroup.findAll({
                where: {
                    group_id: fullAccessGroups,
                }
            });

            // Extract room IDs from the RoomGroup associations
            const roomIds = roomGroups?.map(rg => rg.room_id);

            // Find all meetings where the room is part of the rooms the user can access and need approval
            const meetings = await Meeting.findAll({
                where: {
                    room: roomIds,
                    status: 'Waiting on Approval'
                }
            });

            // Return the filtered meetings the user can see
            return res.status(200).json(meetings);
        }else{
            return res.status(404).json({ message: 'No Items Found' });
        }
        
    } catch (err) {
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error');
    }
};

const CanBook = async (req, res) => {
    try {
        // Extract data from the request body
        const {userId} = req.params;
        const { id, start_time, end_time, room, type, organizer,description, location, name, status, retired, created_user_id, repeats } = req.body;

        // Validate the incoming data (optional but recommended)
        if (!start_time || !end_time || !room || !type || !organizer || !name || !status || !created_user_id) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        // Fetch all groups the user belongs to
        // const groupUsers = await GroupUser.findAll({ where: { user_id: created_user_id } });

        // // If the user is not part of any group, return an empty array
        // if (!groupUsers.length) {
        //     return res.status(200).json([]);
        // }

        // Extract group IDs the user belongs to
        // const groupIds = groupUsers?.map(gu => gu.group_id);

        // Find all room groups that match the user's group memberships
        // const roomGroups = await RoomGroup.findAll({
        //     where: {
        //         group_id: groupIds 
                
        //     }
        // });

        // Extract room IDs from the RoomGroup associations
        // const roomIds = roomGroups?.map(rg => rg.room_id);

        // if (!roomIds.includes(parseInt(room))) {
        //     return res.status(409).json({ message: 'Access denied', book:true });
        // }

        // Find all meetings in the same room
        let meetings = await Meeting.findAll({
            where: {
                room: room, // Only check meetings in the same room
            }
        });

        // Convert start_time and end_time to Date objects for comparison
        const newStartTime = new Date(start_time);
        const newEndTime = new Date(end_time);
        const fakeMeets = await CreateRepeatingMeetings(start_time, 'Month', created_user_id);
        const allMeetsWithRecurrance = [];
        meetings?.map(mt => allMeetsWithRecurrance.push(mt));
        fakeMeets?.map(fm => allMeetsWithRecurrance.push(fm));

        // Check for overlapping meetings
        let isOverlapping = allMeetsWithRecurrance.some(meeting => {
            const meetingStart = new Date(meeting.start_time);
            const meetingEnd = new Date(meeting.end_time);
            let overlaping = false;
            if(meeting.id != id){
                overlaping = (
                
                    newStartTime < meetingEnd && 
                    newEndTime > meetingStart && 
                    meeting.room == room && 
                    ( meeting.status === 'Approved' ||  meeting.status === 'Waiting on Approval')
                );
            }
            // Check if the new meeting overlaps with an existing meeting
            return overlaping;
        });

        if(!isOverlapping && repeats != ''){
            const meeting = {
                start_time, end_time, room, location, type,organizer,
                description, repeats, name, retired, status, created_user_id,
            }
            // Since this meeting is being updated with repeats and it was not before there is no
            // recurrence in the recurrence table and we need a separate funtion to determain if it will overlap anything
            const fakeMeets2 = await CreateRepeatingMeetingsOfThisMeeting(meeting, created_user_id, start_time);
            isOverlapping = fakeMeets2.some(meeting => {
                const meetingStart = new Date(meeting.start_time);
                const meetingEnd = new Date(meeting.end_time);
    
                // Check if the new meeting overlaps with an existing meeting
                return (newStartTime < meetingEnd && newEndTime > meetingStart && meeting.room == room && ( meeting.status === 'Approved' ||  meeting.status === 'Waiting on Approval'));
            });
        }

        // If there is an overlapping meeting, return a conflict message
        if (isOverlapping) {
            return res.status(409).json({ message: 'Meeting time overlaps with an existing meeting', book:false });
        }
        // If does not have access to book in that room, return a conflict message
        const canUserBook = await CanUserBook(room, userId);
        if(!canUserBook){
            return res.status(409).json({ message: 'Access Denied', book:false });
        }

        // If no overlap, return success or proceed with booking logic
        return res.status(200).json({ message: 'Meeting can be booked', book:true });

    } catch (err) {
        console.error('Error fetching room groups:', err);
        res.status(500).send('Server error');
    }
};

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const { start_time, end_time, room, location, type, organizer, description, repeats, name, retired, created_user_id } = req.body;

        // Validate the incoming data (optional but recommended)
        if (!start_time || !end_time || !room || !type || !organizer || !name || !created_user_id) {
            return res.status(400).json({ message: 'Required fields missing' });
        }
        const user = await User.findByPk(created_user_id);

        const meetingStatus = await GetMeetingStatus(room, created_user_id);
        // Create a new resource record in the database
        const newResource = await Meeting.create({
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
            status: !user.admin ? meetingStatus : 'Approved',
            created_user_id,
        });

        if(repeats != ''){
            const recurrence = await MeetingRecurrence.create({
                meeting_id: newResource.id,
                frequency: repeats,
                repeat_until: null,
                active: true
            });
            await newResource.update({recurrence_id: recurrence.id});
        }

        // Return the created record as a JSON response
        res.status(201).json(newResource);
    } catch (err) {
        console.error('Error creating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Update = async (req, res) => {
    try {
        const { id:userId } = req.params;  // Extract ID from URL parameters
        const {id, start_time, end_time, room, location, type, organizer, description, repeats, name, retired, status, created_user_id, recurrence_id } = req.body;  // Extract data from the request body
        // Validate the incoming data (optional but recommended)
        if (!start_time || !end_time || !room || !type || !organizer || !name || !status || !created_user_id) {
            return res.status(400).json({ message: 'Required fields missing' });
        }
        let canDelete = false;
        const user = await User.findByPk(userId);

        if(Number(id) === -1){
            const recurrence = await MeetingRecurrence.findByPk(recurrence_id)
            const parentMeeting = await Meeting.findByPk(recurrence.meeting_id);
            canDelete = await CanDelete(parentMeeting.id, userId);
        }else{
            canDelete = await CanDelete(id, userId);
        }
        console.log('CanDelete',canDelete);
        if(!canDelete) {
            return res.status(409).json({ message: 'Access Denied', update:false });
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
                recurrence_id,
                repeats,
                name,
                retired,
                status: status !== 'Approved' ? !user.admin ? meetingStatus : 'Approved' : 'Approved',
                created_user_id,
            });
            res.status(200).json(newResource);
        }

        const meetingStatus = await GetMeetingStatus(room, created_user_id);

        // Find the existing resource by ID
        const resource = await Meeting.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
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
        if(repeats != null && repeats != ''){
            const recurrence = await MeetingRecurrence.create({
                meeting_id: resource.id,
                frequency: resource.repeats,
                active: true
            });
            await resource.update({recurrence_id: recurrence.id});
        }

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const UpdateOnlyParentRecurrence = async (req, res) => {
    try {
        const { id:userId  } = req.params;  // Extract ID from URL parameters
        const {id, start_time, end_time, room, location, type, organizer, description, repeats, name, retired, status, created_user_id, recurrence_id } = req.body;  // Extract data from the request body
        // Validate the incoming data (optional but recommended)
        if (!start_time || !end_time || !room || !type || !organizer || !name || !status || !created_user_id) {
            return res.status(400).json({ message: 'Required fields missing' });
        }
        let canDelete = false;
        const user = await User.findByPk(userId);
        canDelete = await CanDelete(id, userId);

        if(!canDelete) {
            return res.status(409).json({ message: 'Access Denied', update:false });
        }
        const meetingStatus = await GetMeetingStatus(room, userId);

        // Find the existing resource by ID
        console.log('MeetingId', id);
        const resource = await Meeting.findByPk(id);
        const recurance = await MeetingRecurrence.findByPk(resource.recurrence_id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }else if(repeats != null && repeats != '' && repeats != recurance.frequency){
            return res.status(409).json({ message: 'Cannot Modify Parent Meeting With New Recurrence Schedule', update:false });
        };
        // Find the next parent meeting
        const fakeMeets = await CreateRepeatingMeetings(start_time, "Month", userId);
        let nextDate = new Date(resource.start_time);
        switch(recurance.frequency) {
            case 'Daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'Weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'Monthly':
                nextDate.setMonth(nextDate.getMonth() + 2);
                break;
            case 'Yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            default:
                throw new Error('Invalid range');
        }
        const nextParentMeet = fakeMeets?.find(fm => fm.start_time == nextDate.toISOString());
        if(!nextParentMeet){
            res.status(500).json({ message: 'Server error, Failed to find new parent meeting.' });
        }
        
        // Create the fake meeting
        const nextParent = await Meeting.create({
            ...nextParentMeet,
            id:null
        });
        await recurance.update({
            meeting_id: nextParent.id
        });

        //Update the resource record in the database
        await resource.update({
            start_time,
            end_time,
            room,
            location,
            type,
            organizer,
            description,
            recurrence_id: null,
            repeats: null,
            name,
            retired,
            status: status !== 'Approved' ? !user.admin ? meetingStatus : 'Approved' : 'Approved',
            created_user_id,
        });
        console.log('Updated meeting', new Date(start_time), new Date(end_time));
        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const UpdateAllRecurrence = async (req, res) => {
    try {
        const { userId } = req.params;  // Extract ID from URL parameters
        const { start_time, end_time, room, location, type, organizer, description, repeats, name, status, created_user_id, recurrence_id } = req.body;  // Extract data from the request body
        // Validate the incoming data (optional but recommended)
        if (!start_time || !end_time || !room || !type || !organizer || !name || !status || !created_user_id) {
            return res.status(400).json({ message: 'Required fields missing' });
        }
        let canDelete = false;
        const recurance = await MeetingRecurrence.findByPk(recurrence_id);
        const resource = await Meeting.findByPk(recurance.meeting_id);
        const user = await User.findByPk(userId);
        canDelete = await CanDelete(resource.id, userId);

        if(!canDelete) {
            return res.status(409).json({ message: 'Access Denied', update:false });
        }
        const meetingStatus = await GetMeetingStatus(room, userId);

        // Dont allow to book meet if it overlaps with other meetings
        let fakeMeets = await CreateRepeatingMeetings(start_time, 'Month', userId);
        fakeMeets = fakeMeets.filter(fm => new Date(fm.start_time) >= new Date(start_time) || fm.recurrence_id != recurrence_id);

        // Dont allow update if it overlaps with other meetings
        for(const fm of fakeMeets){
            const overlap = await isOverlappingFakeMeetUpdate(fm);
            if(overlap){
                return res.status(409).json({ message: 'Meeting time overlaps with an existing meeting', update:false });
            }
        }
        
        await recurance.update({
            frequency: repeats
        });
        // Copy time only from the meeting since this can be any meeting within the recurrence
        const newStart = new Date(resource.start_time);
        const newEnd = new Date(resource.end_time);
        newStart.setHours(new Date(start_time).getHours());
        newStart.setMinutes(new Date(start_time).getMinutes());
        newStart.setSeconds(new Date(start_time).getSeconds());
        newStart.setMilliseconds(new Date(start_time).getMilliseconds());
        newEnd.setHours(new Date(end_time).getHours());
        newEnd.setMinutes(new Date(end_time).getMinutes());
        newEnd.setSeconds(new Date(end_time).getSeconds());
        newEnd.setMilliseconds(new Date(end_time).getMilliseconds());

        //Update the resource record in the database
        await resource.update({
            start_time: newStart,
            end_time: newEnd,
            room,
            location,
            type,
            organizer,
            description,
            repeats: repeats,
            name,
            status: status !== 'Approved' ? !user.admin ? meetingStatus : 'Approved' : 'Approved',
            created_user_id,
        });
        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const UpdateAllNextInRecurrence = async (req, res) => {
    try {
        const { userId } = req.params;  // Extract ID from URL parameters
        const {id, start_time, end_time, room, location, type, organizer, description, repeats, name, retired, status, created_user_id, recurrence_id } = req.body;  // Extract data from the request body
        // Validate the incoming data (optional but recommended)
        if (!start_time || !end_time || !room || !type || !organizer || !name || !status || !created_user_id) {
            return res.status(400).json({ message: 'Required fields missing', update:false  });
        }
        let canDelete = false;
        const oldRecurrence = await MeetingRecurrence.findByPk(recurrence_id);
        const oldMeeting = await Meeting.findByPk(oldRecurrence.meeting_id);
        canDelete = await CanDelete(oldMeeting.id, userId);

        if(!canDelete) {
            return res.status(409).json({ message: 'Access Denied', update:false });
        }
        const meetingStatus = await GetMeetingStatus(room, userId);
        let meeting = { id, start_time, end_time, room, location, type, organizer, description, repeats, name, retired, status, created_user_id, recurrence_id };
        
        let fakeMeets = await CreateRepeatingMeetings(start_time, 'Month', created_user_id);
        fakeMeets = fakeMeets.filter(fm => new Date(fm.start_time) >= new Date(start_time) || fm.recurrence_id != recurrence_id);

        // Dont allow update if it overlaps with other meetings
        for(const fm of fakeMeets){
            const overlap = await isOverlappingFakeMeetUpdate(fm);
            if(overlap){
                return res.status(409).json({ message: 'Meeting time overlaps with an existing meeting', update:false });
            }
        }

        if(id === -1){
            meeting = await Meeting.create({
                ...meeting,
                created_user_id: userId,
                status: meetingStatus,
                id:null
            });
        }

        // Stop the old recurring meetings at the updated one
        let stopDate = new Date(start_time)
        stopDate.setDate(new Date(start_time).getDate() - 1);
        await oldRecurrence.update({
            repeat_until: stopDate
        });

        // Create new recurrence from then on for the updated times
        const recurrence = await MeetingRecurrence.create({
            meeting_id: meeting.id,
            frequency: repeats,
            repeat_until: null,
            active: true
        });
        
        //Update the resource record in the database
        await meeting.update({
            recurrence_id: recurrence.id,
        });
        // Return the updated record as a JSON response
        res.status(200).json(meeting);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Delete = async (req, res) => { 
    try {
        const { id, userId } = req.body;  // Extract ID from URL parameters
        
        const canDelete = await CanDelete(id, userId);
        if(!canDelete){
            return res.status(409).json({ message: 'Access Denied', delete:false });
        }

        // Find the existing resource by ID
        const resource = await Meeting.findByPk(id);
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

const CancelNext = async (req, res) => {
    const { recurrence_id, userId, date } = req.body;  // Extract ID from URL parameters
    const recurrence = await MeetingRecurrence.findByPk(recurrence_id);

    const canDelete = await CanDelete(recurrence.meeting_id, userId);
    if(!canDelete){
        return res.status(409).json({ message: 'Access Denied', delete:false });
    }
    await recurrence.update({repeat_until: date});
    res.status(200).json({ message: 'Meetings updated' });
}

const CancelAll = async (req, res) => {
    const { recurrence_id, userId } = req.body;  // Extract ID from URL parameters
    const recurrence = await MeetingRecurrence.findByPk(recurrence_id);

    const canDelete = await CanDelete(recurrence.meeting_id, userId);
    if(!canDelete){
        return res.status(409).json({ message: 'Access Denied', delete:false });
    }
    const today = new Date();
    const meetings = await Meeting.findAll({
        where:{
            recurrence_id: recurrence_id
        }
    });
    for(const meet of meetings){
        await meet.update({status:'Canceled'});
    }

    await recurrence.update({active:false, repeat_until:today});
    res.status(200).json({ message: 'Meetings Canceled' });
}

module.exports = {
    GetAll,
    Post,
    Update,
    Delete,
    GetAllUserCanSee,
    CanBook,
    GetAllNeedsApproval,
    SetStatus,
    GetAllUserCreated,
    CanDelete,
    UpdateOnlyParentRecurrence,
    CancelNext,
    CancelAll,
    UpdateAllNextInRecurrence,
    UpdateAllRecurrence
};
// TODO Test authentication to change other peoples meetings