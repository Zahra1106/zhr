const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB connects before every request (serverless-safe)
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.get('/', (req, res) => {
  res.json({ message: '🎉 ZHR Clothing API is running successfully!' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/fabrics', require('./routes/fabricRoutes'));
app.use('/api/design-options', require('./routes/designOptionRoutes'));
app.use('/api/designs', require('./routes/designRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

module.exports = app;