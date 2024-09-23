import { useState } from "react";
import { Stack, Typography, Button, Dialog, Divider, Input } from "@mui/material";
import { showError, showSuccess } from "../../../../Utilites/Functions/ApiFunctions";
import { useAuth } from "../../../../Utilites/AuthContext";
import { PostResource } from "../../../../Utilites/Functions/ApiFunctions/ResourceFunctions";


const AddNewResource = ({ open, setOpen, location, setUpdate }) => {
    const ariaLabel = { 'aria-label': 'description' };
    const [name, setName] = useState('');
    const {user} = useAuth();

    const onClose = () => {
        setName('');
        setOpen(false);
    };

    
    const onSubmit = () => {
        if(name != ''){
            PostResource({name:name, location: location.officeid, created_user_id: user?.id})
                .then((resp) => resp ? showSuccess("Saved") : showError("Failed to save"))
                .then(() => setUpdate(prev => prev + 1));
            setName('');
            setOpen(false);
        }else{
            showError("Name field cannot be empty")
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
                    Create Resource
                </Typography>
                <Divider width={'100%'} />
                <Input
                    sx={{ marginTop: '30px' }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Resource Name"
                    inputProps={ariaLabel}
                />
                <Button variant="outlined" sx={{ marginTop: '20px', backgroundColor: 'rgba(0,170,0,.2)', ':hover': { backgroundColor: 'rgba(0,200,0,.4)' } }} onClick={onSubmit}>
                    Submit
                </Button>
            </Stack>
        </Dialog>
    );
};

export default AddNewResource;
