const errorHandler = (err, req, res, next) => {
    console.error("ERROR:", err.message);
    console.error("SQL:", err.sql);
    console.error("STACK:", err.stack);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
    });
};

module.exports = errorHandler;
