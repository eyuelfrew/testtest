const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

// Load environment variables early
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

async function initializeApp() {
  try {
    const dbName = process.env.DB_NAME || 'research_dynamic_forms';
    console.log(`Ensuring database '${dbName}' exists...`);

    // 1. Create DB if it doesn't exist using core mysql2
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();
    console.log('Database check passed.');

    // 2. NOW we can safely require Sequelize models and our Routes
    const sequelize = require('./config/db');
    const formRoutes = require('./routes/api');

    app.use('/api', formRoutes);

    // 3. Sync Database Schemas & Start Server
    await sequelize.sync({ alter: true });
    console.log('Database schema synced successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize the application framework:', err);
    process.exit(1);
  }
}

initializeApp();
