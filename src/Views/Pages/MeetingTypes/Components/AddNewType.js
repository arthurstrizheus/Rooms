import { useState } from "react";
import {Grid, Stack, Typography, Button, Dialog,  Box, Divider, Input} from "@mui/material";
import { SketchPicker } from 'react-color'
import { showError } from "../../../../Utilites/Functions/ApiFunctions";
import {PostMeetingType} from '../../../../Utilites/Functions/ApiFunctions/MeetingTypeFunctions';
import { useAuth } from "../../../../Utilites/AuthContext";

const AddNewType = ({ open, setOpen,setUpdate}) => {
    const ariaLabel = { 'aria-label': 'description' };
    const [color, setColor] = useState('');
    const [typeName, setTypeName] = useState('');
    const {user} = useAuth();

    const onClose = () => {
        setOpen(false);
        setTypeName('');
        setColor('');
        setUpdate(prev => prev + 1);
    };

    const handleChange = (newColor) => {
        setColor(newColor.hex);
    };

    const onSubmit = () => {
        if(color != '' && typeName != ''){
            PostMeetingType({value: typeName, color:color, created_user_id: user?.id}).then(() => onClose());
        }else{
            showError('Fields cannot be empty');
        }
    };

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
                    Add Item Type
                </Typography>
                <Divider width={'100%'} />
                <Input
                    sx={{ marginTop: '30px' }}
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    placeholder="Type Name"
                    inputProps={ariaLabel}
                />
                <Grid sx={{ border: '1px solid black', borderRadius: '20px', marginTop: '20px', padding:'10px', paddingLeft:'37px'}}>
                    <Stack direction={'row'} padding={'5px'} spacing={1}>
                        <Typography marginLeft={'10px'}>Select Type Color</Typography>
                        <Box width={'40px'} height={'20px'} backgroundColor={color} border={'1px solid black'} />
                    </Stack>
                    <Box sx={{ width: '100%'}} justifyContent={'center'}>
                        <SketchPicker
                            color={color}
                            onChange={(e) => handleChange(e)}
                        />
                    </Box>
                </Grid>
                <Button variant="outlined" sx={{ marginTop: '20px', backgroundColor: 'rgba(0,170,0,.2)', ':hover': { backgroundColor: 'rgba(0,200,0,.4)' } }} onClick={onSubmit}>
                    Submit
                </Button>
            </Stack>
        </Dialog>
    );
};

export default AddNewType;
