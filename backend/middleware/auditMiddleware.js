// Middleware to automatically add created_by and updated_by fields to request body
// This should be used after auth middleware so req.user is available

const addAuditFields = (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
        // If no user, continue without adding audit fields
        return next();
    }

    // For POST requests (create operations), add created_by
    if (req.method === "POST" && req.body) {
        req.body.created_by = userId;
        req.body.updated_by = userId;
    }

    // For PUT/PATCH requests (update operations), add updated_by
    if ((req.method === "PUT" || req.method === "PATCH") && req.body) {
        req.body.updated_by = userId;
    }

    next();
};

module.exports = addAuditFields;
