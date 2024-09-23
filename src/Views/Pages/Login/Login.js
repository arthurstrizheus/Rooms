import {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../Utilites/AuthContext';
import { Grid, Typography, Box, Checkbox, Button, Container, CssBaseline, Avatar, TextField, FormControlLabel, Link } from "@mui/material";
import LockIcon from '@mui/icons-material/Lock';
import { AuthenticateUser } from "../../../Utilites/Functions/ApiFunctions/UserFunctions";

function Copyright(props) {
    return (
        <Typography variant="body2" color="text.secondary" align="center" {...props}>
            {'Copyright © '}
            <Link color="inherit" href="https://sealimited.com/">
                S.E.A. Limited
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
        </Typography>
    );
}

export default function Login({setLoading}) {
    const navigate = useNavigate();
    const { setUser, login } = useAuth();
    const [rememberMe, setRememberMe] = useState(false); // State to track "Remember me"
    const [email, setEmail] = useState('');

    // On component mount, check if user info exists in localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedRememberMe = localStorage.getItem('rememberMe') === 'true';

        if (storedUser) {
            setUser(JSON.parse(storedUser));
            navigate(localStorage.getItem('lastlocation'));
            login();
        }
        if(storedRememberMe){
            setEmail(localStorage.getItem('email'));
        }
    }, []);

    const handleSubmit = (event) => {
        setLoading(true);
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        AuthenticateUser({ email: data.get('email'), password: data.get('password') }).then(resp => {
            if (resp?.id) {
                setUser(resp);
                login();

                localStorage.setItem('user', JSON.stringify(resp));

                if (rememberMe) {
                    localStorage.setItem('email', `${data.get('email')}`);
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    // Clear user from localStorage if "Remember me" is not checked
                    localStorage.removeItem('email');
                }
                setLoading(false);
                navigate('/schedule/type/day');
            }
        });
    };

    const handleRememberMeChange = (event) => {
        setRememberMe(event.target.checked);
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                    <LockIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Sign in
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                    />
                    <FormControlLabel
                        control={<Checkbox checked={rememberMe} onChange={handleRememberMeChange} color="primary" />}
                        label="Remember me"
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Sign In
                    </Button>
                    <Grid container>
                        <Grid item xs>
                            <Link href="#" variant="body2">
                                Forgot password?
                            </Link>
                        </Grid>
                        <Grid item>
                            <Link href="/signup" variant="body2">
                                {"Don't have an account? Sign Up"}
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
            <Copyright sx={{ mt: 8, mb: 4 }} />
        </Container>
    );
}
