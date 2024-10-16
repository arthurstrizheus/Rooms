const { User, GroupUser } = require('../models');
const bcrypt = require('bcrypt');

const saltRounds = 10;

async function hashPassword(plainPassword) {
    try {
        const hash = await bcrypt.hash(plainPassword, saltRounds);
        // Store the hash in your database
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
}

async function verifyPassword(plainPassword, hash) {
    try {
        const isMatch = await bcrypt.compare(plainPassword, hash);
        return isMatch;
    } catch (error) {
        console.error('Error verifying password:', error);
        throw error;
    }
}

const GetAll = async (req, res) => {
    try {
        const data = await User.findAll();
        const noPass = data?.map(usr => {
            const userObj = usr.get({ plain: true });  // Convert Sequelize instance to plain object
            return { ...userObj, password: undefined };  // Remove the password
        });
        res.json(noPass);  // Send the users without the password field
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Server error');
    }
};


const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const { email, password, admin, first_name, last_name, location, last_login, created_user_id, active } = req.body;

        // Validate the incoming data (optional but recommended)
        if (!email || !password || !first_name || !last_name ) {
            return res.status(400).json({ message: 'email, password, first_name, last_name, last_login, and created_user_id are required' });
        }
        const usr = await User.findOne({where: {email:email}});
        if(usr){
            return res.status(409).json({ message: 'User with this email already exists'});
        }
        let passHash = '';
        try{
            passHash = await hashPassword(password);
        }catch{
            console.error('Error creating resource:', err);
            res.status(500).json({ message: 'Server error' });
        }
        

        // Create a new resource record in the database
        const newResource = await User.create({
            email,
            password: passHash,
            admin,
            first_name,
            last_name,
            active,
            location: location ? location : 0,
            last_login: created_user_id ? null : new Date().toISOString(),
            created_user_id: created_user_id ? created_user_id : null,
        });

        await GroupUser.create({
            user_id: newResource.id,
            group_id: 12,
        });

        await GroupUser.create({
            user_id: newResource.id,
            group_id: 13,
        });

        const userWithoutPassword = { ...newResource.get(), password: undefined };
        // Return the created record as a JSON response
        res.status(201).json(userWithoutPassword);
    } catch (err) {
        console.error('Error creating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Update = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters
        const { email, admin, first_name, last_name, location } = req.body;  // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!email|| !first_name || !last_name) {
            return res.status(400).json({ message: 'email, first_name, and last_name are required' });
        }

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            email,
            admin,
            first_name,
            last_name,
            location: location ? location : 0,
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const UpdateDetails = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters
        const { first_name, last_name, location } = req.body;  // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!first_name || !last_name) {
            return res.status(400).json({ message: 'first_name, and last_name are required' });
        }

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            first_name,
            last_name,
            location: location ? location : 0,
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const UpdatePassword = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters
        const {password} = req.body;  // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!password) {
            return res.status(400).json({ message: 'password is required' });
        }

        let passHash = '';
        try{
            passHash = await hashPassword(password);
        }catch{
            console.error('Error creating resource:', err);
            res.status(500).json({ message: 'Server error' });
        }

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            password: passHash
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Delete = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
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

const Authenticate = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await verifyPassword(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }else if(!user.active){
            return res.status(401).json({ message: 'Account has been deactivated.' });
        }
        await user.update({
            last_login: new Date().toISOString()
        });
        // Authentication successful, return the user object (omit password)
        const userWithoutPassword = { ...user.get(), password: undefined };
        return res.status(200).json(userWithoutPassword);

    } catch (error) {
        console.error('Error during authentication:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}

const Deactivate = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters
        console.log(id);
        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            active: false
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const Activate = async (req, res) => {
    try {
        const { id } = req.params;  // Extract ID from URL parameters

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        // Update the resource record in the database
        await resource.update({
            active: true
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    GetAll,
    Post,
    Update,
    Delete,
    Authenticate,
    Deactivate,
    Activate,
    UpdateDetails,
    UpdatePassword,
};
