const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ message: '🎉 ZHR Clothing API is running successfully!' });
});

// Routes will be added here later
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/fabrics', require('./routes/fabricRoutes'));
app.use('/api/design-options', require('./routes/designOptionRoutes'));
app.use('/api/designs', require('./routes/designRoutes'));
// app.use('/api/categories', require('./routes/categoryRoutes'));

module.exports = app;