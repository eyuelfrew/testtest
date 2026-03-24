const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Field = require('./Field');

const FieldValidation = sequelize.define('FieldValidation', {
    field_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // DataRequired, MinLength, etc.
    error_message: { type: DataTypes.STRING },
    value: { type: DataTypes.TEXT } // could be JSON string
});

module.exports = FieldValidation;