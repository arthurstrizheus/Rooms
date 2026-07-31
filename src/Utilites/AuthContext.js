import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
//id: 2, firstName: "Geust", lastName: "User", email: 'geustuser@sealimited.com', admin:true, location:1, password:'123456', group:1, status_group:1
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check for existing session on app load
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");

        if (storedUser && storedToken) {
            console.log("🔄 Restoring user session from localStorage");
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
        }
    }, []);

    const login = (userData, token) => {
        console.log(
            "🔐 Login called with user:",
            userData?.username,
            "token:",
            token ? "present" : "missing"
        );

        setIsAuthenticated(true);
        setUser(userData);

        // Store user and token in localStorage
        if (userData) {
            localStorage.setItem("user", JSON.stringify(userData));
        }
        if (token) {
            localStorage.setItem("authToken", token);
            console.log("✅ Token stored in localStorage");
        } else {
            console.log("⚠️ No token provided to login function");
        }
    };

    const logout = () => {
        console.log("🚪 Logging out user");
        setIsAuthenticated(false);
        setUser(null);
        /*
         * Remember-me is a stored *value*, not a stored presence, so it has to
         * be compared and not coerced. Login.js writes the string "true" when
         * the switch is on and the string "false" when it is off (both arms of
         * handleSubmit), and removes the key entirely when the switch is
         * unticked. `Boolean(remember)` was true for all three of "true",
         * "false" and "" — so an explicit "false" took the branch that
         * preserves the address, i.e. logout treated a user who had declined
         * remember-me as one who had asked for it.
         *
         * `=== "true"` is the same test Login.js:164 and SideBar.js:210 already
         * apply to this key, so all three readers now agree. The `=== true` arm
         * covers a real boolean: `getItem` only ever hands back a string or
         * null today, but nothing stops a later writer from storing the boolean
         * (or reading it back through the JSON-parsing useLocalStorage hook),
         * and an unrecognised value must fall to the clearing branch.
         */
        const remember = localStorage.getItem("rememberMe");
        const rememberMeIsOn = remember === "true" || remember === true;
        if (rememberMeIsOn) {
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            localStorage.removeItem("lastLocation");
        } else {
            // Clear localStorage
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            localStorage.removeItem("email");
            localStorage.removeItem("rememberMe");
            localStorage.removeItem("lastLocation");
        }
    };

    /*
     * The `setUser` handed to consumers, and the fix. `login` was the only
     * writer of the stored user, so an in-session update — MyAccount's profile
     * save — changed React state only; every reader of the session re-hydrates
     * from localStorage (the mount effect above, App.js, Login.js), so the next
     * reload showed the stale row even though the PUT had been committed.
     *
     * The write mirrors login's exactly — same "user" key, same
     * `JSON.stringify` of the same object — so the stored shape is unchanged
     * and nothing new is exposed: the value is the already-stored user, which
     * the API returns with `password: undefined` and the token as a sibling
     * held separately under "authToken".
     *
     * `login` and `logout` deliberately keep calling the raw `setUser` setter,
     * so neither changes: `login()` with no argument (Signup.js) must not clear
     * the entry Signup just wrote, and logout's own clearing stays the only
     * thing that runs. A value carrying no `id` is not a session, so it clears
     * instead of writing — SideBar's `setUser({})` runs AFTER `logout()` and
     * must not resurrect the key logout just removed.
     */
    /*
     * The latest user, mirrored, so the functional form below resolves against
     * something fresher than a render closure. `user` is captured once per
     * render, so two `setUser(fn)` calls batched into a single tick would both
     * receive the same pre-batch value: the second would silently discard the
     * first, and the localStorage write beside it would persist that discarded
     * state. No current caller passes a function, so this is a trap rather than
     * a live fault — but the setter's shape invites one.
     *
     * Every writer stays covered. `login`, `logout` and the mount effect keep
     * using the raw setter and are picked up here once they commit; the raw
     * setter is deliberately left alone, for the reasons below. `updateUser`
     * advances the ref itself so a batch of its own calls chains correctly, and
     * a commit that lands afterwards simply re-affirms the same value.
     */
    const userRef = useRef(null);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const updateUser = (value) => {
        const nextUser =
            typeof value === "function" ? value(userRef.current) : value;
        userRef.current = nextUser;
        setUser(nextUser);
        if (nextUser?.id) {
            localStorage.setItem("user", JSON.stringify(nextUser));
        } else {
            localStorage.removeItem("user");
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, login, logout, isAuthenticated, setUser: updateUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
