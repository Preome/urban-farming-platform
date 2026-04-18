const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get user's plants
router.get('/', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const plants = await prisma.plantTracking.findMany({
      where: { userId: req.user.id },
      include: {
        healthUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: plants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create plant tracking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const plant = await prisma.plantTracking.create({
      data: {
        ...req.body,
        userId: req.user.id
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Plant tracking created',
      data: plant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update plant health (with real-time socket)
router.patch('/:id/health', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { healthStatus, notes } = req.body;
    
    const plant = await prisma.plantTracking.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { healthStatus }
    });
    
    // Create health update record
    const healthUpdate = await prisma.plantHealthUpdate.create({
      data: {
        plantTrackingId: plant.id,
        healthStatus,
        notes
      }
    });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.to(`plant-${plant.id}`).emit('health-update', {
      plantId: plant.id,
      healthStatus,
      notes,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Plant health updated',
      data: { plant, healthUpdate }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;