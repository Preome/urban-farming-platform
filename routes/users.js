const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        vendorProfile: {
          include: {
            sustainabilityCerts: true,
            produces: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });
    
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, phoneNumber, farmName, farmLocation } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true
      }
    });
    
    if (req.user.role === 'VENDOR' && (farmName || farmLocation || phoneNumber)) {
      await prisma.vendorProfile.update({
        where: { userId: req.user.id },
        data: {
          farmName: farmName || undefined,
          farmLocation: farmLocation || undefined,
          phoneNumber: phoneNumber || undefined
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create vendor profile (for customers becoming vendors)
router.post('/become-vendor', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { farmName, farmLocation, farmDescription, phoneNumber } = req.body;
    
    const existingVendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id }
    });
    
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile already exists'
      });
    }
    
    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: req.user.id,
        farmName,
        farmLocation,
        farmDescription,
        phoneNumber,
        certificationStatus: 'PENDING'
      }
    });
    
    // Update user role
    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'VENDOR' }
    });
    
    res.status(201).json({
      success: true,
      message: 'Vendor profile created, pending certification',
      data: vendorProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;