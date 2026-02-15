const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Route Imports
const foodRoutes = require('./routes/foodRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Model Imports
const Message = require('./models/Message');
const Request = require('./models/Request');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

// --- API ROUTES ---
app.use('/api/food', foodRoutes);
app.use('/api/auth', authRoutes); 
app.use('/api/admin', adminRoutes);

// --- CHAT HISTORY API ---
app.get('/api/chat/history/:requestId', async (req, res) => {
  try {
    const messages = await Message.find({ requestId: req.params.requestId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "History Error" });
  }
});

// --- SOCKET.IO REAL-TIME LOGIC ---
io.on('connection', (socket) => {
  console.log('User Connected: ' + socket.id);

  // User joins a specific room based on the Request ID
  socket.on('joinChat', ({ requestId }) => {
    if (requestId) {
      socket.join(requestId);
      console.log(`✅ Room Joined: ${requestId}`);
    }
  });

  // Handling sending messages
  socket.on('sendMessage', async (data) => {
    const { requestId, senderId, text } = data;
    
    // Safety check for valid data
    if (!senderId || senderId === "undefined" || !text) {
      console.log("⚠️ Blocked invalid message: Missing senderId or text");
      return;
    }

    try {
      const newMessage = new Message({
        requestId,
        senderId,
        text,
        timestamp: new Date()
      });
      
      // Save to MongoDB
      await newMessage.save();

      // Broadcast to everyone in the room (Donor and NGO)
      io.to(data.requestId).emit('newMessage', newMessage);
      console.log(`💾 Message from ${senderId} saved & broadcasted`);

    } catch (err) {
      console.error("❌ Socket Error:", err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected');
  });
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));