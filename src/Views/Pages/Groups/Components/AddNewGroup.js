import { useEffect, useState } from "react";
import {Stack, Typography, Button, Dialog, Divider, Input, FormControl, InputLabel, Select, MenuItem} from "@mui/material";
import { useAuth } from "../../../../Utilites/AuthContext";
import {PostGroup} from '../../../../Utilites/Functions/ApiFunctions/GroupFunctions';
import { showError } from "../../../../Utilites/Functions/ApiFunctions";

const AddNewGroup = ({ open, setOpen, location, locations, setUpdate}) => {
    const {user} = useAuth();
    const ariaLabel = { 'aria-label': 'description' };
    const [access, setAccess] = useState('');
    const [groupName, setGroupName] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(location);

    const onClose = () => {
        setOpen(false);
        setGroupName('');
        setAccess('');
        setUpdate(prev => prev + 1);
    };

    const onSubmit = () => {
        console.log(groupName, access, selectedLocation)
        if(groupName != '' && access != '' && (selectedLocation?.officeid || selectedLocation?.officeid === 0)){
            PostGroup({ group_name: groupName, access: access, location: selectedLocation.officeid, created_user_id: user?.id}).then(() => onClose());
        }else{
            showError("Fields cannot be empty");
        }
    };

    useEffect(() => {setSelectedLocation(location);}, [location]);

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
                    Add New Group
                </Typography>
                <Divider width={'100%'} />
                <Input
                    sx={{ marginTop: '30px' }}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group Name"
                    inputProps={ariaLabel}
                />
                <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                    <InputLabel id="demo-simple-select-standard-label">Select Access</InputLabel>
                    <Select
                        sx={{width:'100%'}}
                        labelId="demo-simple-select-standard-label"
                        id="demo-simple-select-standard"
                        value={access}
                        onChange={(e) => setAccess(e.target.value)}
                    >
                        <MenuItem key={1} value={'Full'}>Full</MenuItem>
                        <MenuItem key={2} value={'Read'}>Read</MenuItem>
                    </Select>
                </FormControl>
                { location === 0 || location == undefined || location == null &&
                    <FormControl variant="standard" sx={{minWidth: 160, width:'100%'}}>
                        <InputLabel id="demo-simple-select-standard-label-location">Select Location</InputLabel>
                        <Select
                            sx={{width:'100%'}}
                            labelId="demo-simple-select-standard-label-location"
                            id="demo-simple-select-standard-location"
                            value={selectedLocation?.officeid === 0 ? 0 : selectedLocation?.officeid ? selectedLocation.officeid : ''}
                            onChange={(e) => {
                                const selectedItem = locations?.find(itm => itm.officeid === e.target.value);
                                setSelectedLocation(selectedItem); // Return the entire object
                            }}
                        >
                            {locations?.map((itm, index) => <MenuItem key={index} value={itm.officeid}>{itm.Alias}</MenuItem>)}
                        </Select>
                    </FormControl>
                }
                <Button variant="outlined" sx={{ marginTop: '20px', backgroundColor: 'rgba(0,170,0,.2)', ':hover': { backgroundColor: 'rgba(0,200,0,.4)' } }} onClick={onSubmit}>
                    Submit
                </Button>
            </Stack>
        </Dialog>
    );
};

export default AddNewGroup;
