const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FieldOptionDependency = sequelize.define('FieldOptionDependency', {
    parent_option_id: DataTypes.INTEGER,
    child_option_id: DataTypes.INTEGER
});

module.exports = FieldOptionDependency;