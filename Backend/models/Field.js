const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Form = require('./Form');

const Field = sequelize.define('Field', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    form_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false }, // e.g., attr_176_type
    label: { type: DataTypes.STRING },
    data_type: { type: DataTypes.STRING, defaultValue: 'str' },
    input_type: { type: DataTypes.STRING, allowNull: false }, // e.g., single_select, text
    placeholder: { type: DataTypes.STRING },
    hint: { type: DataTypes.STRING },
    unit: { type: DataTypes.STRING },
    pos: { type: DataTypes.INTEGER, defaultValue: 0 },
    url: { type: DataTypes.STRING }, // endpoint for dynamic options
    parent_field_id: { type: DataTypes.INTEGER, allowNull: true } // for cascading fields
}, { timestamps: true });

module.exports = Field;