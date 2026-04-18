const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Make prisma and io available in routes
app.set('prisma', prisma);
app.set('io', io);

// ============= IMPORT ALL ROUTES =============
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const produceRoutes = require('./routes/produce');
const rentalRoutes = require('./routes/rentals');
const orderRoutes = require('./routes/orders');
const communityRoutes = require('./routes/community');
const plantRoutes = require('./routes/plants');
const certificationRoutes = require('./routes/certifications');
const adminRoutes = require('./routes/admin');

// ============= MOUNT ROUTES =============
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/produce', produceRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/admin', adminRoutes);

// ============= SWAGGER UI SETUP =============
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// ============= ROOT ENDPOINT =============
app.get('/', (req, res) => {
  res.json({
    name: 'Urban Farming Platform API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      produce: '/api/produce',
      rentals: '/api/rentals',
      orders: '/api/orders',
      community: '/api/community',
      plants: '/api/plants',
      certifications: '/api/certifications',
      admin: '/api/admin',
      docs: '/api-docs',
      health: '/health'
    }
  });
});

// ============= SOCKET.IO CONNECTION =============
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('track-plant', (plantId) => {
    console.log(`Client ${socket.id} tracking plant: ${plantId}`);
    socket.join(`plant-${plantId}`);
  });
  
  socket.on('plant-update', async (data) => {
    const { plantId, healthStatus, notes } = data;
    console.log(`Plant update for ${plantId}: ${healthStatus}`);
    
    // Store in database
    try {
      await prisma.plantHealthUpdate.create({
        data: {
          plantTrackingId: plantId,
          healthStatus: healthStatus,
          notes: notes
        }
      });
      
      await prisma.plantTracking.update({
        where: { id: plantId },
        data: { healthStatus: healthStatus }
      });
    } catch (error) {
      console.error('Error saving plant update:', error);
    }
    
    // Broadcast to all clients tracking this plant
    io.to(`plant-${plantId}`).emit('health-update', {
      plantId,
      healthStatus,
      notes,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ============= ERROR HANDLING MIDDLEWARE =============
// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: {
      auth: 'POST /api/auth/register, POST /api/auth/login',
      produce: 'GET /api/produce, POST /api/produce',
      rentals: 'GET /api/rentals, POST /api/rentals/:id/book',
      orders: 'GET /api/orders/my-orders, POST /api/orders',
      community: 'GET /api/community/posts, POST /api/community/posts',
      plants: 'GET /api/plants, POST /api/plants',
      docs: 'GET /api-docs'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============= START SERVER =============
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`🌱 Available endpoints:`);
  console.log(`   POST /api/auth/register - Register user`);
  console.log(`   POST /api/auth/login - Login user`);
  console.log(`   GET /api/produce - Get all products`);
  console.log(`   GET /api/rentals - Get rental spaces`);
  console.log(`   GET /api/community/posts - Get forum posts`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    prisma.$disconnect();
  });
});

module.exports = { app, server, io };