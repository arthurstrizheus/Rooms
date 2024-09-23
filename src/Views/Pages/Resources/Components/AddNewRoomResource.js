import { useEffect, useState } from "react";
import { Stack, Typography, Button, Dialog, FormControl, InputLabel, Select, Divider, MenuItem } from "@mui/material";
import { PostRoomResource } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";
import { showError, showSuccess } from "../../../../Utilites/Functions/ApiFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";


const AddNewRoomResource = ({ open, setOpen, rooms, roomResources, resources, setUpdate }) => {
    const {user} = useAuth();
    const [room, setRoom] = useState('');
    const [resource, setResource] = useState('');
    const [filteredResources, setFilteredResources] = useState(resources);
    

    const onClose = () => {
        setRoom('');
        setResource('');
        setOpen(false);
    };

    const onSubmit = () => {

        if(room?.id && resource?.id){
            
            PostRoomResource({room_id:room.id, resource_id: resource.id, created_user_id: user?.id})
            .then((resp) => resp ? showSuccess("Saved") : showError("Failed to save"))
            .then(() => setUpdate(prev => prev + 1));
        }else{
            showError('Fields cannot be empty');
        } 
        onClose();
    };
    useEffect(() => {
        if(room?.id){
            setFilteredResources(resources.filter(r => r.id != roomResources.find(rr => rr.room_id == room.id)?.resources_id));
        }else{
            setFilteredResources(resources);
        }
    },[room])

    return (
        <Dialog open={!!open} onClose={onClose} maxWidth="xs">
            <Stack direction={'column'} sx={{width:'300px', padding: '20px' }}>
                <Typography
                    variant="h5"
                    textAlign={'center'}
                    width={'100%'}
                    fontFamily={'Courier New, sans-serif'}
                    marginBottom={2}
                >
                    Add Resource To Room
                </Typography>
                <Divider width={'100%'} />
                <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                    <InputLabel id="demo-simple-select-standard-label">Select Room</InputLabel>
                    <Select
                        sx={{width:'100%'}}
                        labelId="demo-simple-select-standard-label"
                        id="demo-simple-select-standard"
                        value={room?.id || ''}
                        onChange={(e) => {
                            const selectedItem = rooms.find(itm => itm.id === e.target.value);
                            setRoom(selectedItem); // Return the entire object
                        }}
                    >
                        {rooms.map((itm, index) => <MenuItem key={index} value={itm.id}>{itm.value}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                    <InputLabel id="demo-simple-select-standard-label">Select Resource</InputLabel>
                    <Select
                        sx={{width:'100%'}}
                        labelId="demo-simple-select-standard-label"
                        id="demo-simple-select-standard"
                        value={resource?.id || ''}
                        onChange={(e) => {
                            const selectedItem = filteredResources.find(itm => itm.id === e.target.value);
                            setResource(selectedItem); // Return the entire object
                        }}
                    >
                        {filteredResources.map((itm, index) => <MenuItem key={index} value={itm.id}>{itm.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Button variant="outlined" sx={{ marginTop: '20px', backgroundColor: 'rgba(0,170,0,.2)', ':hover': { backgroundColor: 'rgba(0,200,0,.4)' } }} onClick={onSubmit}>
                    Submit
                </Button>
            </Stack>
        </Dialog>
    );
};

export default AddNewRoomResource;
