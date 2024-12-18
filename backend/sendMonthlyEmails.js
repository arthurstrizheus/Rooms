const {
  getAllFullOUAssociates,
} = require("./controllers/matterManagerController");

// Call the function
getAllFullOUAssociates()
  .then(() => {
    console.log("Monthly email task completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error executing monthly email task:", err);
    process.exit(1);
  });
