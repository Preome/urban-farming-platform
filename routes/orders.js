const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Create order
router.post('/', authMiddleware, roleMiddleware('CUSTOMER'), strictLimiter, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { items, shippingAddress } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }
    
    let totalAmount = 0;
    const orderItems = [];
    let vendorId = null;
    
    // Process each item
    for (const item of items) {
      const produce = await prisma.produce.findUnique({
        where: { id: item.produceId }
      });
      
      if (!produce) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.produceId} not found`
        });
      }
      
      if (produce.availableQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for ${produce.name}`
        });
      }
      
      if (!vendorId) vendorId = produce.vendorId;
      if (vendorId !== produce.vendorId) {
        return res.status(400).json({
          success: false,
          message: 'All items must be from the same vendor'
        });
      }
      
      const itemTotal = produce.price * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        produceId: item.produceId,
        quantity: item.quantity,
        price: produce.price
      });
    }
    
    // Create order
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        vendorId: vendorId,
        totalAmount: totalAmount,
        shippingAddress: shippingAddress,
        status: 'PENDING',
        items: {
          create: orderItems
        }
      },
      include: {
        items: {
          include: {
            produce: true
          }
        }
      }
    });
    
    // Update product quantities
    for (const item of items) {
      await prisma.produce.update({
        where: { id: item.produceId },
        data: {
          availableQuantity: {
            decrement: item.quantity
          }
        }
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user orders
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { page = 1, limit = 20, status } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const where = { userId: req.user.id };
    if (status) where.status = status;
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          items: {
            include: {
              produce: true
            }
          },
          vendor: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        items: orders,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          pages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get vendor orders
router.get('/vendor-orders', authMiddleware, roleMiddleware('VENDOR'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }
    
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const where = { vendorId: vendorProfile.id };
    if (status) where.status = status;
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          items: {
            include: {
              produce: true
            }
          },
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        items: orders,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          pages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update order status (Vendor/Admin)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { status } = req.body;
    
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { vendor: true }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check permissions
    if (req.user.role === 'VENDOR' && order.vendor.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        items: {
          include: {
            produce: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Order status updated',
      data: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Cancel order
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true
      }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }
    
    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`
      });
    }
    
    // Restore product quantities
    for (const item of order.items) {
      await prisma.produce.update({
        where: { id: item.produceId },
        data: {
          availableQuantity: {
            increment: item.quantity
          }
        }
      });
    }
    
    const cancelledOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: cancelledOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;