const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FormCategory = sequelize.define('FormCategory', {
    category_id: { type: DataTypes.INTEGER, primaryKey: true },
    form_id: { type: DataTypes.INTEGER, primaryKey: true }
}, { timestamps: false });

module.exports = FormCategory;
