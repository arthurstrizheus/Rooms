const { Office, Group } = require("../models");

const GetAll = async (req, res) => {
  try {
    let data = await Office.findAll();
    if (data?.length == 0 || !data) {
      await Office.create({
        Alias: "All",
        Airport: "All",
        Zip: "All",
        state: "All",
        SAddress: "All",
        Number: "All",
        City: "All",
      });
      try {
        await Group.create({
          group_name: "All",
          access: "Read",
          location: 1,
        });
        await Group.create({
          group_name: "All",
          access: "Full",
          location: 1,
        });
      } catch {
        console.log("Failed to create Groups");
      }
      data = await Office.findAll();
    }
    res.json(data);
  } catch (err) {
    console.error("Error fetching room groups:", err);
    res.status(500).send("Server error");
  }
};

const Post = async (req, res) => {
  try {
    // Extract data from the request body
    const { Alias, Airport, Zip, state, SAddress, Number, City } = req.body;

    // Validate the incoming data (optional but recommended)
    if (!Alias || !Zip || !state || !SAddress || !Number || !City) {
      return res.status(400).json({
        message:
          "Alias, Airport, Zip, state, SAddress, Number, and City are required",
      });
    }

    // Create a new resource record in the database
    const newResource = await Office.create({
      Alias,
      Airport,
      Zip,
      state,
      SAddress,
      Number,
      City,
    });

    // Return the created record as a JSON response
    res.status(201).json(newResource);
  } catch (err) {
    console.error("Error creating resource:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const Update = async (req, res) => {
  try {
    const { id } = req.params; // Extract ID from URL parameters
    const { Alias, Airport, Zip, state, SAddress, Number, City } = req.body; // Extract data from the request body

    // Validate the incoming data (optional but recommended)
    if (!Alias || !Zip || !state || !SAddress || !Number || !City) {
      return res.status(400).json({
        message:
          "Alias, Airport, Zip, state, SAddress, Number, and City are required",
      });
    }

    // Find the existing resource by ID
    const resource = await Office.findByPk(id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    // Update the resource record in the database
    await resource.update({
      Alias,
      Airport,
      Zip,
      state,
      SAddress,
      Number,
      City,
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
    const resource = await Office.findByPk(id);
    if (resource.Alias == "All") {
      return res
        .status(409)
        .json({ message: "Cannot cannot delete ALL location" });
    }
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
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

module.exports = {
  GetAll,
  Post,
  Update,
  Delete,
};
