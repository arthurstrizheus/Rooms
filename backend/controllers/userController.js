const { User } = require("../models");
const bcrypt = require("bcrypt");
const ActiveDirectory = require("activedirectory2");
const ldapConfig = require("../ldapConfig");
const ad = new ActiveDirectory(ldapConfig);
const util = require("util");
const jwt = require("jsonwebtoken");
const activeDirectory = require("../services/activeDirectory");

// Promisify the callback-based functions
const findUserAsync = util.promisify(ad.findUser.bind(ad));
const authenticateAsync = util.promisify(ad.authenticate.bind(ad));

const saltRounds = 10;

/**
 * Guard for the endpoints that reach into Active Directory.
 *
 * Enumerating the corporate directory or provisioning an account is not
 * something an ordinary signed-in user should be able to do, and none of the
 * /ad/ handlers checked for it. Identity comes from req.user (set by
 * middleware/auth.js from the verified JWT) — never from the body, which the
 * caller controls.
 *
 * Responds with the 403 itself and returns false, so callers can simply
 * `if (!requireDirectoryAccess(req, res)) return;`.
 */
const requireDirectoryAccess = (req, res) => {
    if (req.user?.admin || req.user?.equipment_admin) {
        return true;
    }
    res.status(403).json({
        message: "Administrator privileges required for directory access.",
    });
    return false;
};

async function hashPassword(plainPassword) {
    try {
        const hash = await bcrypt.hash(plainPassword, saltRounds);
        // Store the hash in your database
        return hash;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw error;
    }
}

async function verifyPassword(plainPassword, hash) {
    try {
        const isMatch = await bcrypt.compare(plainPassword, hash);
        return isMatch;
    } catch (error) {
        console.error("Error verifying password:", error);
        throw error;
    }
}

const GetAll = async (req, res) => {
    try {
        let data = [];
        if (
            req.user?.admin ||
            req.user?.equipment_office_admin ||
            req.user?.equipment_admin ||
            req.user?.tax_admin
        ) {
            data = await User.findAll();
        }
        const noPass = data?.map((usr) => {
            const userObj = usr.get({ plain: true }); // Convert Sequelize instance to plain object
            return { ...userObj, password: undefined }; // Remove the password
        });
        res.json(noPass); // Send the users without the password field
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).send("Server error");
    }
};

const GetById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "UserUpdatedBy",
                    attributes: ["id", "first_name", "last_name", "email"],
                },
            ],
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove password from response
        const userObj = user.get({ plain: true });
        const { password, ...userWithoutPassword } = userObj;

        res.json(userWithoutPassword);
    } catch (err) {
        console.error("Error fetching user:", err);
        next(err);
    }
};

const Post = async (req, res) => {
    try {
        // Extract data from the request body
        const {
            email,
            password,
            admin,
            first_name,
            last_name,
            location,
            last_login,
            created_user_id,
            equipment_office_admin,
            equipment_admin,
            tax_admin,
            active,
        } = req.body;

        // Validate the incoming data
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({
                message:
                    "email, password, first_name, last_name, last_login, and created_user_id are required",
            });
        }
        if (admin && !req.user?.admin) {
            return res.status(403).json({
                message: "Admin privileges required to add user as an admin",
            });
        }
        const usr = await User.findOne({ where: { email: email } });
        if (usr) {
            return res
                .status(409)
                .json({ message: "User with this email already exists" });
        }
        let passHash = "";
        try {
            passHash = await hashPassword(password);
        } catch (err) {
            console.error("Error creating resource:", err);
            return res
                .status(500)
                .json({ message: "Server error", error: err });
        }

        // Create a new resource record in the database
        const newResource = await User.create({
            email,
            password: passHash,
            admin,
            first_name,
            last_name,
            active,
            equipment_office_admin: equipment_office_admin || null,
            equipment_admin: equipment_admin || false,
            tax_admin: tax_admin || false,
            location: location ? location : 0,
            last_login: created_user_id ? null : new Date().toISOString(),
            created_user_id: created_user_id ? created_user_id : null,
        });

        // Two `GroupUser.create` calls used to sit here, adding the new user to
        // hardcoded group ids 12 and 13. There is no GroupUser model and no
        // groups table in this app -- both are meeting-room concepts that came
        // across with the shared user table -- so `GroupUser` was undefined and
        // this threw a TypeError on every call. Creating a user by hand has
        // been returning a 500 (after writing the row) for as long as the code
        // has looked like this.

        const userWithoutPassword = {
            ...newResource.get(),
            password: undefined,
        };

        // Send socket message to update user lists
        const io = req.app.get("io");
        if (io) {
            const { SendMessage } = require("../utils/socketUtils");
            SendMessage(
                {
                    message: "user_created",
                    data: { user: userWithoutPassword },
                },
                {}, // Send to all connected users
            );
        }

        // Return the created record as a JSON response
        res.status(201).json(userWithoutPassword);
    } catch (err) {
        console.error("Error creating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const Update = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters
        const {
            email,
            admin,
            first_name,
            last_name,
            location,
            equipment_office_admin,
            equipment_admin,
            tax_admin,
        } = req.body; // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!email || !first_name || !last_name) {
            return res.status(400).json({
                message: "email, first_name, and last_name are required",
            });
        }

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }
        if (
            req.user?.equipment_office_admin != resource.location &&
            !req.user?.admin &&
            !req.user?.equipment_admin
        ) {
            return res
                .status(403)
                .json({ message: "Cannot modify users from another office." });
        }
        if (admin && !req.user?.admin) {
            return res.status(403).json({
                message:
                    "Admin privileges required to add or modify user that is an admin",
            });
        }

        // Update the resource record in the database
        await resource.update({
            email,
            admin,
            first_name,
            last_name,
            location: location ? location : 0,
            equipment_office_admin: equipment_office_admin || null,
            equipment_admin: equipment_admin || false,
            tax_admin: tax_admin || false,
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const UpdateDetails = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters
        const { first_name, last_name, location } = req.body; // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!first_name || !last_name) {
            return res
                .status(400)
                .json({ message: "first_name, and last_name are required" });
        }

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
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
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const UpdatePassword = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters
        const { password } = req.body; // Extract data from the request body

        // Validate the incoming data (optional but recommended)
        if (!password) {
            return res.status(400).json({ message: "password is required" });
        }

        let passHash = "";
        try {
            passHash = await hashPassword(password);
        } catch {
            console.error("Error creating resource:", err);
            res.status(500).json({ message: "Server error" });
        }

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        // Update the resource record in the database
        await resource.update({
            password: passHash,
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const Delete = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }
        if (
            req.user?.equipment_office_admin != resource.location &&
            !req.user?.admin &&
            !req.user?.equipment_admin
        ) {
            return res
                .status(403)
                .json({ message: "Cannot modify users from another office." });
        }
        if (resource.admin && !req.user?.admin) {
            return res.status(403).json({
                message:
                    "Admin privileges required to remove user that is an admin",
            });
        }

        // Delete the resource record from the database
        await resource.destroy();

        // Return a success message
        res.status(200).json({ message: "Resource deleted successfully" });
    } catch (err) {
        console.error("Error deleting resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const Authenticate = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ where: { email: email } });

        if (!user) {
            return res
                .status(401)
                .json({ message: "Invalid email or password." });
        }

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await verifyPassword(password, user.password);

        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ message: "Invalid email or password." });
        } else if (!user.active) {
            return res
                .status(401)
                .json({ message: "Account has been deactivated." });
        }

        await user.update({
            last_login: new Date().toISOString(),
        });

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                admin: user.admin,
                equipment_office_admin: user.equipment_office_admin,
                equipment_admin: user.equipment_admin,
                tax_admin: user.tax_admin,
                location: user.location,
            },
            process.env.JWT_SECRET,
            { expiresIn: "168h" }, // 7 days
        );

        // Authentication successful, return the user object and token
        const userWithoutPassword = { ...user.get(), password: undefined };
        return res.status(200).json({
            user: userWithoutPassword,
            token: token,
        });
    } catch (error) {
        console.error("Error during authentication:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

const userExistsInAd = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({
                message: "Username is required",
                exists: false,
            });
        }

        // Your AD check logic here
        // This should return true/false based on whether user exists in AD
        const exists = await checkUserInAD(username); // Replace with your actual AD check function

        const userAcc = await User.findOne({
            where: {
                username: username.includes("@")
                    ? username.split("@")[0]
                    : username,
            },
        });

        // `accountCreated` tells Login.js whether it still needs to ask for a
        // location, so it is true only when a row exists AND already has one.
        //
        // This was `!!userAcc || !userAcc.location`, which threw on the case
        // the endpoint exists to serve: for a real AD user who has never
        // logged in, `userAcc` is null, so `||` went on to dereference it. The
        // catch below then reported `exists: false` — the endpoint claimed a
        // genuine AD account was not in AD, and first-time sign-in was stuck.
        res.json({ exists, accountCreated: !!userAcc && !!userAcc.location });
    } catch (error) {
        console.error("Error checking user in AD:", error);
        res.status(500).json({
            message: "Server error",
            exists: false,
            accountCreated: false,
        });
    }
};

const AuthenticateAD = async (req, res) => {
    const { email: username, password, location } = req.body;

    try {
        // Validate input
        if (!username || !password) {
            return res
                .status(400)
                .json({ message: "Username and password are required." });
        }
        let cleanUsername = username;
        if (username.includes("@")) {
            cleanUsername = username.split("@")[0];
        }
        // Find user in AD
        let user;
        try {
            user = await findUserAsync(cleanUsername);
        } catch (err) {
            console.error("Error finding user:", err);
            return res.status(500).json({
                message: "Failed to retrieve user information.",
                data: err,
            });
        }
        if (!user.location) {
        }

        if (!user) {
            return res
                .status(400)
                .json({ message: "User not found in S-E-A directory." });
        }

        // Authenticate user
        let auth;
        try {
            auth = await authenticateAsync(
                `${cleanUsername}@sealimited`,
                password,
            );
        } catch (err) {
            console.error("Authentication error:", err);
            return res.status(500).json({
                message: "Failed to authenticate user in AD.",
                data: err,
            });
        }

        if (!auth) {
            return res.status(401).json({ message: "Authentication failed." });
        }
        console.log(`User ${user?.displayName} authenticated in AD.`);

        const [exUser, created] = await User.findOrCreate({
            where: { username: cleanUsername }, // Use Auth0 user ID as unique identifier
            defaults: {
                username: cleanUsername,
                email: `${cleanUsername}@sealimited.com`,
                admin: false,
                password: "",
                first_name: user.givenName,
                last_name: user.sn,
                last_login: new Date().toISOString(),
                created_user_id: null,
                active: true,
                location: location,
            },
        });

        if (exUser) {
            const userWithoutPassword = {
                ...exUser.get(),
                password: undefined,
            };
            if (!exUser.location && location) {
                await exUser.update({
                    location: location,
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: userWithoutPassword.id,
                    email: userWithoutPassword.email,
                    username: userWithoutPassword.username,
                    first_name: userWithoutPassword.first_name,
                    last_name: userWithoutPassword.last_name,
                    admin: userWithoutPassword.admin,
                    equipment_office_admin:
                        userWithoutPassword.equipment_office_admin,
                    equipment_admin: userWithoutPassword.equipment_admin,
                    tax_admin: userWithoutPassword.tax_admin,
                    location: userWithoutPassword.location,
                },
                process.env.JWT_SECRET,
                { expiresIn: "168h" }, // 7 days
            );

            return res.status(200).json({
                user: userWithoutPassword,
                token: token,
            });
        } else if (created) {
            if (!location) {
                return res
                    .status(400)
                    .json({ message: "Location is required." });
            }

            const userWithoutPassword = {
                ...created.get(),
                password: undefined,
            };

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: userWithoutPassword.id,
                    email: userWithoutPassword.email,
                    username: userWithoutPassword.username,
                    first_name: userWithoutPassword.first_name,
                    last_name: userWithoutPassword.last_name,
                    admin: userWithoutPassword.admin,
                    equipment_office_admin:
                        userWithoutPassword.equipment_office_admin,
                    equipment_admin: userWithoutPassword.equipment_admin,
                    tax_admin: userWithoutPassword.tax_admin,
                    location: userWithoutPassword.location,
                },
                process.env.JWT_SECRET,
                { expiresIn: "168h" }, // 7 days
            );

            return res.status(200).json({
                user: userWithoutPassword,
                token: token,
            });
        } else {
            return res
                .status(401)
                .json({ message: "User not found in the database." });
        }
    } catch (error) {
        console.error("Error during authentication:", error);
        return res
            .status(500)
            .json({ message: "Internal server error.", data: error });
    }
};

// Add the missing checkUserInAD function
const checkUserInAD = async (username) => {
    try {
        let cleanUsername = username;
        if (username.includes("@")) {
            cleanUsername = username.split("@")[0];
        }

        const user = await findUserAsync(cleanUsername);
        return !!user; // Return true if user exists, false otherwise
    } catch (error) {
        console.error("Error checking user in AD:", error);
        return false;
    }
};

const Deactivate = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters
        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        // Check permissions: admin and equipment_admin can deactivate any user
        // equipment_office_admin can only deactivate users in their office
        if (
            !req.user?.admin &&
            !req.user?.equipment_admin &&
            req.user?.equipment_office_admin != resource.location
        ) {
            return res
                .status(403)
                .json({ message: "Cannot modify users from another office." });
        }

        // Update the resource record in the database
        await resource.update({
            active: false,
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const Activate = async (req, res) => {
    try {
        const { id } = req.params; // Extract ID from URL parameters

        // Find the existing resource by ID
        const resource = await User.findByPk(id);
        if (!resource) {
            return res.status(404).json({ message: "Resource not found" });
        }

        // Check permissions: admin and equipment_admin can activate any user
        // equipment_office_admin can only activate users in their office
        if (
            !req.user?.admin &&
            !req.user?.equipment_admin &&
            req.user?.equipment_office_admin != resource.location
        ) {
            return res
                .status(403)
                .json({ message: "Cannot modify users from another office." });
        }

        // Update the resource record in the database
        await resource.update({
            active: true,
        });

        // Return the updated record as a JSON response
        res.status(200).json(resource);
    } catch (err) {
        console.error("Error updating resource:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const GetAllAdUsers = async (req, res) => {
    try {
        if (!requireDirectoryAccess(req, res)) {
            return;
        }

        // Query AD for all users
        const findAllUsers = util.promisify(ad.findUsers.bind(ad));
        const adUsers = await findAllUsers();

        if (!adUsers || adUsers.length === 0) {
            return res.json([]);
        }

        // Get existing users from database
        const existingUsers = await User.findAll({
            attributes: ["username"],
        });
        const existingUsernames = new Set(
            existingUsers.map((u) => u.username?.toLowerCase()),
        );

        // Filter and format AD users
        const availableUsers = adUsers
            .filter((adUser) => {
                const username = adUser.sAMAccountName?.toLowerCase();
                const displayName = adUser.displayName?.toLowerCase() || "";
                const firstName = adUser.givenName;

                // Filter out users already in database
                if (!username || existingUsernames.has(username)) {
                    return false;
                }

                // Filter out users without first name
                if (!firstName || firstName.trim() === "") {
                    return false;
                }

                // Filter out users with "admin" in username or display name
                if (
                    username.includes("admin") ||
                    displayName.includes("admin")
                ) {
                    return false;
                }

                if (username.includes("vimf") || displayName.includes("vimf")) {
                    return false;
                }

                if (username.includes("svc") || displayName.includes("svc")) {
                    return false;
                }

                if (username.includes("test") || displayName.includes("test")) {
                    return false;
                }

                if (username.includes("demo") || displayName.includes("demo")) {
                    return false;
                }
                if (
                    username.includes("guest") ||
                    displayName.includes("guest")
                ) {
                    return false;
                }
                if (username.includes("temp") || displayName.includes("temp")) {
                    return false;
                }
                if (
                    username.includes("backup") ||
                    displayName.includes("backup")
                ) {
                    return false;
                }

                return true;
            })
            .map((adUser) => ({
                username: adUser.sAMAccountName,
                displayName:
                    adUser.displayName || `${adUser.givenName} ${adUser.sn}`,
                firstName: adUser.givenName,
                lastName: adUser.sn,
                email: adUser.mail || `${adUser.sAMAccountName}@sealimited.com`,
            }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));

        res.json(availableUsers);
    } catch (error) {
        console.error("Error fetching AD users:", error);
        res.status(500).json({
            message: "Failed to retrieve AD users",
            error: error.message,
        });
    }
};

const CreateFromAd = async (req, res) => {
    try {
        if (!requireDirectoryAccess(req, res)) {
            return;
        }

        const { username, location } = req.body;

        if (!username || !location) {
            return res
                .status(400)
                .json({ message: "Username and location are required" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res
                .status(409)
                .json({ message: "User already exists in database" });
        }

        // Get user info from AD
        let adUser;
        try {
            adUser = await findUserAsync(username);
        } catch (err) {
            console.error("Error finding user in AD:", err);
            return res
                .status(404)
                .json({ message: "User not found in Active Directory" });
        }

        if (!adUser) {
            return res
                .status(404)
                .json({ message: "User not found in Active Directory" });
        }

        // Create user in database
        const newUser = await User.create({
            username: username,
            email: adUser.mail || `${username}@sealimited.com`,
            admin: false,
            password: "",
            first_name: adUser.givenName,
            last_name: adUser.sn,
            last_login: null,
            created_user_id: req.user?.id,
            active: true,
            location: location,
            equipment_office_admin: null,
            equipment_admin: false,
            tax_admin: false,
        });

        const userWithoutPassword = {
            ...newUser.get(),
            password: undefined,
        };

        // Send socket message to update user lists
        const io = req.app.get("io");
        if (io) {
            const { SendMessage } = require("../utils/socketUtils");
            SendMessage(
                {
                    message: "user_created",
                    data: { user: userWithoutPassword },
                },
                {}, // Send to all connected users
            );
        }

        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error("Error creating user from AD:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

/**
 * GET /api/users/ad/groups?search=<term>
 *
 * Backs the AD group picker on the equipment approver form. Always answers
 * with { configured, groups } so the frontend can tell "LDAP isn't set up
 * here" apart from "that search matched nothing".
 */
const SearchAdGroups = async (req, res) => {
    try {
        if (!requireDirectoryAccess(req, res)) {
            return;
        }

        const search =
            typeof req.query.search === "string" ? req.query.search.trim() : "";

        // A one-character term against a corporate directory returns thousands
        // of groups slowly and is useless as a picker, so it returns nothing
        // rather than everything.
        if (search.length < 2) {
            return res.json({
                configured: activeDirectory.isConfigured(),
                groups: [],
            });
        }

        const groups = await activeDirectory.findGroups(search);

        res.json({
            configured: activeDirectory.isConfigured(),
            groups,
        });
    } catch (error) {
        console.error("Error searching AD groups:", error);
        res.status(500).json({
            message: "Failed to search Active Directory groups",
            configured: false,
            groups: [],
        });
    }
};

module.exports = {
    GetAll,
    GetById,
    Post,
    Update,
    Delete,
    Authenticate,
    Deactivate,
    Activate,
    UpdateDetails,
    UpdatePassword,
    AuthenticateAD,
    userExistsInAd,
    GetAllAdUsers,
    CreateFromAd,
    SearchAdGroups,
};
