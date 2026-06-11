const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Meeting = sequelize.define(
  "Meeting",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    room: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    location: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    organizer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    repeats: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recurrence_id: {
      type: DataTypes.INTEGER, // Links to the meeting of the recurrence
      allowNull: true,
      references: {
        model: "Rooms-MeetingRecurrences",
        key: "id",
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    retired: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    all_day: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    it_support: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    it_support_details: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },
    created_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    dev: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    updated_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW, // Set default value
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW, // Set default value
    },
  },
  {
    tableName: "Rooms-Meetings",
    timestamps: true,
  }
);

module.exports = Meeting;
