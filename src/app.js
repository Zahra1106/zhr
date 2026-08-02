const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));   // <-- ye naya add karein
app.use('/api/reviews', require('./routes/reviewRoutes'));

module.exports = app;