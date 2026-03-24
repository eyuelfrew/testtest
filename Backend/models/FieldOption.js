const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Field = require('./Field');

const FieldOption = sequelize.define('FieldOption', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    field_id: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.STRING, allowNull: false },
    checked: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_popular: { type: DataTypes.BOOLEAN, defaultValue: false },
    parent_option_id: { type: DataTypes.INTEGER, allowNull: true }
});

module.exports = FieldOption;