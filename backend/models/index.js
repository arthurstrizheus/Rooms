const { sequelize } = require("../config/database");
const User = require("./user");
const Equipment = require("./equipment");
const Checkout = require("./checkout");
const EquipmentFile = require("./equipmentFile");
const EquipmentAlert = require("./equipmentAlert");
const CalibrationHistory = require("./calibrationHistory");
const CheckoutRecurrence = require("./checkoutRecurrence");
const Office = require("./office");

const initModels = () => {
    // Equipment associations
    Equipment.hasMany(Checkout, {
        foreignKey: "equipment_id",
        onDelete: "CASCADE",
    });
    Checkout.belongsTo(Equipment, {
        foreignKey: "equipment_id",
        onDelete: "CASCADE",
    });

    Equipment.hasMany(EquipmentFile, {
        foreignKey: "equipment_id",
        onDelete: "CASCADE",
    });
    EquipmentFile.belongsTo(Equipment, {
        foreignKey: "equipment_id",
        onDelete: "CASCADE",
    });

    Equipment.hasMany(EquipmentAlert, {
        foreignKey: "equipment_id",
        onDelete: "CASCADE",
    });
    EquipmentAlert.belongsTo(Equipment, {
        foreignKey: "equipment_id",
        onDelete: "CASCADE",
    });

    Equipment.hasMany(CalibrationHistory, {
        foreignKey: "equipment_id",
        onDelete: "CASCADE",
    });
    CalibrationHistory.belongsTo(Equipment, {
        foreignKey: "equipment_id",
        onDelete: "CASCADE",
    });

    // User associations
    User.hasMany(Checkout, {
        foreignKey: "user_id",
        as: "Checkouts",
    });
    Checkout.belongsTo(User, {
        foreignKey: "user_id",
        as: "User",
    });

    User.hasMany(Checkout, {
        foreignKey: "approved_by_user_id",
        as: "ApprovedCheckouts",
    });
    Checkout.belongsTo(User, {
        foreignKey: "approved_by_user_id",
        as: "ApprovedBy",
    });

    User.hasMany(EquipmentFile, {
        foreignKey: "uploaded_by_user_id",
    });
    EquipmentFile.belongsTo(User, {
        foreignKey: "uploaded_by_user_id",
        as: "UploadedBy",
    });

    User.hasMany(EquipmentAlert, {
        foreignKey: "user_id",
        onDelete: "CASCADE",
    });
    EquipmentAlert.belongsTo(User, {
        foreignKey: "user_id",
        onDelete: "CASCADE",
    });

    User.hasMany(CalibrationHistory, {
        foreignKey: "performed_by_user_id",
    });
    CalibrationHistory.belongsTo(User, {
        foreignKey: "performed_by_user_id",
        as: "PerformedBy",
    });

    // CalibrationHistory to EquipmentFile association
    CalibrationHistory.belongsTo(EquipmentFile, {
        foreignKey: "certificate_file_id",
        as: "CertificateFile",
        onDelete: "NO ACTION",
        onUpdate: "NO ACTION",
    });
    EquipmentFile.hasMany(CalibrationHistory, {
        foreignKey: "certificate_file_id",
        onDelete: "NO ACTION",
        onUpdate: "NO ACTION",
    });

    // CheckoutRecurrence associations
    CheckoutRecurrence.hasMany(Checkout, {
        foreignKey: "recurrence_id",
        as: "Checkouts",
        onDelete: "CASCADE",
    });
    Checkout.belongsTo(CheckoutRecurrence, {
        foreignKey: "recurrence_id",
        as: "Recurrence",
        onDelete: "CASCADE",
    });

    // Audit trail associations - created_by and updated_by
    // Equipment
    User.hasMany(Equipment, {
        foreignKey: "created_by",
        as: "CreatedEquipment",
    });
    Equipment.belongsTo(User, {
        foreignKey: "created_by",
        as: "CreatedBy",
    });
    User.hasMany(Equipment, {
        foreignKey: "updated_by",
        as: "UpdatedEquipment",
    });
    Equipment.belongsTo(User, {
        foreignKey: "updated_by",
        as: "UpdatedBy",
    });

    // Checkout
    User.hasMany(Checkout, {
        foreignKey: "created_by",
        as: "CreatedCheckouts",
    });
    Checkout.belongsTo(User, {
        foreignKey: "created_by",
        as: "CheckoutCreatedBy",
    });
    User.hasMany(Checkout, {
        foreignKey: "updated_by",
        as: "UpdatedCheckouts",
    });
    Checkout.belongsTo(User, {
        foreignKey: "updated_by",
        as: "CheckoutUpdatedBy",
    });

    // EquipmentFile
    User.hasMany(EquipmentFile, {
        foreignKey: "created_by",
        as: "CreatedFiles",
    });
    EquipmentFile.belongsTo(User, {
        foreignKey: "created_by",
        as: "FileCreatedBy",
    });
    User.hasMany(EquipmentFile, {
        foreignKey: "updated_by",
        as: "UpdatedFiles",
    });
    EquipmentFile.belongsTo(User, {
        foreignKey: "updated_by",
        as: "FileUpdatedBy",
    });

    // CalibrationHistory
    User.hasMany(CalibrationHistory, {
        foreignKey: "created_by",
        as: "CreatedCalibrations",
    });
    CalibrationHistory.belongsTo(User, {
        foreignKey: "created_by",
        as: "CalibrationCreatedBy",
    });
    User.hasMany(CalibrationHistory, {
        foreignKey: "updated_by",
        as: "UpdatedCalibrations",
    });
    CalibrationHistory.belongsTo(User, {
        foreignKey: "updated_by",
        as: "CalibrationUpdatedBy",
    });

    // EquipmentAlert
    User.hasMany(EquipmentAlert, {
        foreignKey: "created_by",
        as: "CreatedAlerts",
    });
    EquipmentAlert.belongsTo(User, {
        foreignKey: "created_by",
        as: "AlertCreatedBy",
    });
    User.hasMany(EquipmentAlert, {
        foreignKey: "updated_by",
        as: "UpdatedAlerts",
    });
    EquipmentAlert.belongsTo(User, {
        foreignKey: "updated_by",
        as: "AlertUpdatedBy",
    });

    // CheckoutRecurrence
    User.hasMany(CheckoutRecurrence, {
        foreignKey: "created_by",
        as: "CreatedRecurrences",
    });
    CheckoutRecurrence.belongsTo(User, {
        foreignKey: "created_by",
        as: "RecurrenceCreatedBy",
    });
    User.hasMany(CheckoutRecurrence, {
        foreignKey: "updated_by",
        as: "UpdatedRecurrences",
    });
    CheckoutRecurrence.belongsTo(User, {
        foreignKey: "updated_by",
        as: "RecurrenceUpdatedBy",
    });

    // User updated_by (self-referential)
    User.belongsTo(User, {
        foreignKey: "updated_by",
        as: "UserUpdatedBy",
    });
};

module.exports = {
    sequelize,
    User,
    Equipment,
    Checkout,
    EquipmentFile,
    EquipmentAlert,
    CalibrationHistory,
    CheckoutRecurrence,
    Office,
    initModels,
};
