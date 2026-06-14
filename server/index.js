require('dotenv').config();
require('./firebaseAdmin'); // initialise Firebase Admin early
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

const allowedOrigin = (origin, cb) => {
  if (!origin) return cb(null, true);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return cb(null, true);
  if (origin?.endsWith('.vercel.app')) return cb(null, true);
  cb(new Error('Not allowed by CORS'));
};

const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ['GET', 'POST'], credentials: true },
});

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/posts',    require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));

// Socket.IO
const { setIo } = require('./socket/ioInstance');
setIo(io);
require('./socket/socketHandler')(io);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/socialapp')
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
