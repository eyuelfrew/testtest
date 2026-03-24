const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Form = require('./Form');

const Submission = sequelize.define('Submission', {
    form_id: { type: DataTypes.INTEGER, allowNull: false },
    data: { type: DataTypes.JSON, allowNull: false } // stores field_name: value
}, { timestamps: true });

module.exports = Submission;