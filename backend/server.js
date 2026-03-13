const express = require('express');
const dotenv = require('dotenv');
const path = require('path'); // Add this
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Route Imports
const foodRoutes = require('./routes/foodRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Model Imports
const Message = require('./models/Message');
const Food = require('./models/Food');

// Load env variables with explicit path
dotenv.config({ path: path.join(__dirname, '.env') }); 

// DEBUG: Check if URI is loaded (Delete this after it works)
console.log("Checking DB URI:", process.env.MONGO_URI ? "FOUND ✅" : "NOT FOUND ❌");

connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set('socketio', io);

app.use(express.json());
app.use(cors());

// Initialize Background Job (TC_E03)
require('./jobs/scheduler'); 

// Routes
app.use('/api/food', foodRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io Real-time Logic
io.on('connection', (socket) => {
  console.log('User Connected: ' + socket.id);

  socket.on('joinChat', ({ requestId }) => {
    if (requestId) {
      socket.join(requestId);
      console.log(`✅ Room Joined: ${requestId}`);
    }
  });

  socket.on('sendMessage', async (data) => {
    const { requestId, senderId, text } = data;
    
    if (!senderId || senderId === "undefined" || !text) return;

    try {
      const food = await Food.findById(requestId);
      if (food && food.status === 'Expired') {
          socket.emit('error_message', 'Food expired. Chat closed.');
          return;
      }

      const newMessage = new Message({ requestId, senderId, text, timestamp: new Date() });
      await newMessage.save();

      io.to(requestId).emit('newMessage', newMessage);
    } catch (err) {
      console.error("❌ Socket Error:", err.message);
    }
  });

  socket.on('disconnect', () => console.log('User Disconnected'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));