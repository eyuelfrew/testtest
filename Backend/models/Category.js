const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Category = sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    parent_id: { type: DataTypes.INTEGER, allowNull: true },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    image: { type: DataTypes.STRING, allowNull: true },
    image_v2: { type: DataTypes.STRING, allowNull: true },
    position: { type: DataTypes.INTEGER, defaultValue: 0 },
    listing_on_top_lvl: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: false });

module.exports = Category;
