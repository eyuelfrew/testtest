const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: "mysql",
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

/**
 * Creates the database if it doesn't exist
 * This connects to MySQL without specifying a database first
 */
const createDatabase = async () => {
    const { Sequelize } = require("sequelize");
    
    // Connect without specifying a database
    const rootSequelize = new Sequelize(
        "", // No database name
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            dialect: "mysql",
            logging: false,
        }
    );

    try {
        await rootSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`✅ Database '${process.env.DB_NAME}' created or already exists.`);
        await rootSequelize.close();
        return true;
    } catch (error) {
        console.error("❌ Failed to create database:", error.message);
        await rootSequelize.close();
        throw error;
    }
};

module.exports = sequelize;
module.exports.createDatabase = createDatabase;
