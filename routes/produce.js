const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get all produce with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { page = 1, limit = 20, category, minPrice, maxPrice, organic, search } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const where = {
      certificationStatus: 'APPROVED',
      availableQuantity: { gt: 0 }
    };
    
    if (category) where.category = category;
    if (organic === 'true') where.isOrganic = true;
    if (minPrice) where.price = { gte: parseFloat(minPrice) };
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice) };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [produce, total] = await Promise.all([
      prisma.produce.findMany({
        where,
        skip,
        take,
        include: {
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
      prisma.produce.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        items: produce,
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

// Create produce (Vendor only)
router.post('/', authMiddleware, roleMiddleware('VENDOR'), strictLimiter, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!vendorProfile) {
      return res.status(403).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }
    
    const produce = await prisma.produce.create({
      data: {
        ...req.body,
        vendorId: vendorProfile.id,
        certificationStatus: vendorProfile.certificationStatus === 'APPROVED' ? 'APPROVED' : 'PENDING'
      },
      include: {
        vendor: true
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Produce created successfully',
      data: produce
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single produce
router.get('/:id', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const produce = await prisma.produce.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          include: {
            user: {
              select: { name: true, email: true }
            },
            sustainabilityCerts: true
          }
        }
      }
    });
    
    if (!produce) {
      return res.status(404).json({
        success: false,
        message: 'Produce not found'
      });
    }
    
    res.json({
      success: true,
      data: produce
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;