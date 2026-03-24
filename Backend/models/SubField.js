const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Field = require('./Field');

const SubField = sequelize.define('SubField', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    parent_field_id: { type: DataTypes.INTEGER, allowNull: false },
    trigger_option_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: false },
    input_type: { type: DataTypes.STRING, allowNull: false },
    pos: { type: DataTypes.INTEGER, defaultValue: 0 },
    required: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

module.exports = SubField;
