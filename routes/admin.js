const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const router = express.Router();

// Apply admin middleware to all routes
router.use(authMiddleware, roleMiddleware('ADMIN'));

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    
    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalOrders,
      totalRevenue,
      pendingCertifications,
      totalProducts,
      activeRentals
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'VENDOR' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: 'DELIVERED' },
        _sum: { totalAmount: true }
      }),
      prisma.sustainabilityCert.count({ where: { status: 'PENDING' } }),
      prisma.produce.count(),
      prisma.rentalBooking.count({ where: { status: 'CONFIRMED' } })
    ]);
    
    res.json({
      success: true,
      data: {
        users: { total: totalUsers, vendors: totalVendors, customers: totalCustomers },
        orders: { total: totalOrders, revenue: totalRevenue._sum.totalAmount || 0 },
        certifications: { pending: pendingCertifications },
        products: { total: totalProducts },
        rentals: { active: activeRentals }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { page = 1, limit = 20, role, status } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          vendorProfile: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        items: users,
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

// Update user status
router.patch('/users/:id/status', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { status } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true
      }
    });
    
    res.json({
      success: true,
      message: 'User status updated',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get pending certifications
router.get('/certifications/pending', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const certifications = await prisma.sustainabilityCert.findMany({
      where: { status: 'PENDING' },
      include: {
        vendor: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({
      success: true,
      data: certifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Approve certification
router.post('/certifications/:id/approve', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    
    const certification = await prisma.sustainabilityCert.findUnique({
      where: { id: req.params.id },
      include: { vendor: true }
    });
    
    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found'
      });
    }
    
    // Update certification status
    await prisma.sustainabilityCert.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' }
    });
    
    // Update vendor certification status
    await prisma.vendorProfile.update({
      where: { id: certification.vendorId },
      data: { certificationStatus: 'APPROVED' }
    });
    
    // Update all vendor products to approved
    await prisma.produce.updateMany({
      where: { vendorId: certification.vendorId },
      data: { certificationStatus: 'APPROVED' }
    });
    
    res.json({
      success: true,
      message: 'Certification approved and vendor verified'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all orders (admin view)
router.get('/orders', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { page = 1, limit = 20, status } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const where = {};
    if (status) where.status = status;
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { name: true, email: true }
          },
          vendor: {
            include: {
              user: {
                select: { name: true }
              }
            }
          },
          items: {
            include: {
              produce: true
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

module.exports = router;