const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Form = sequelize.define('Form', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' },
    category_id: { type: DataTypes.INTEGER, allowNull: true }
}, { timestamps: true });

module.exports = Form;