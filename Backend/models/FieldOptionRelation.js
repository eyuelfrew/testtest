// models/FieldOptionRelation.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FieldOptionRelation = sequelize.define('FieldOptionRelation', {
    parent_field_id: DataTypes.INTEGER,
    parent_option_id: DataTypes.INTEGER,
    child_field_id: DataTypes.INTEGER,
    child_option_id: DataTypes.INTEGER
});

module.exports = FieldOptionRelation;