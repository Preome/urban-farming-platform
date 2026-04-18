const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get available rental spaces with location-based search
router.get('/', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { page = 1, limit = 20, location, minPrice, maxPrice, minSize } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const where = { availability: true };
    
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }
    if (minPrice) where.pricePerMonth = { gte: parseFloat(minPrice) };
    if (maxPrice) where.pricePerMonth = { ...where.pricePerMonth, lte: parseFloat(maxPrice) };
    if (minSize) where.size = { gte: parseFloat(minSize) };
    
    const [spaces, total] = await Promise.all([
      prisma.rentalSpace.findMany({
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
        orderBy: { pricePerMonth: 'asc' }
      }),
      prisma.rentalSpace.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        items: spaces,
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

// Book a rental space
router.post('/:id/book', authMiddleware, roleMiddleware('CUSTOMER'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { startDate, endDate } = req.body;
    
    const rentalSpace = await prisma.rentalSpace.findUnique({
      where: { id: req.params.id }
    });
    
    if (!rentalSpace || !rentalSpace.availability) {
      return res.status(404).json({
        success: false,
        message: 'Rental space not available'
      });
    }
    
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const totalPrice = rentalSpace.pricePerMonth * (days / 30);
    
    const booking = await prisma.rentalBooking.create({
      data: {
        userId: req.user.id,
        rentalSpaceId: rentalSpace.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPrice
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Rental space booked successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;