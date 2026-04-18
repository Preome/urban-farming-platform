const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const router = express.Router();

// Submit certification (Vendor)
router.post('/', authMiddleware, roleMiddleware('VENDOR'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { certifyingAgency, certificationNumber, certificationDate, expiryDate, documentUrl } = req.body;
    
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Vendor profile not found'
      });
    }
    
    const certification = await prisma.sustainabilityCert.create({
      data: {
        vendorId: vendorProfile.id,
        certifyingAgency,
        certificationNumber,
        certificationDate: new Date(certificationDate),
        expiryDate: new Date(expiryDate),
        documentUrl,
        status: 'PENDING'
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Certification submitted for review',
      data: certification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get vendor certifications
router.get('/my-certifications', authMiddleware, roleMiddleware('VENDOR'), async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id }
    });
    
    const certifications = await prisma.sustainabilityCert.findMany({
      where: { vendorId: vendorProfile.id },
      orderBy: { createdAt: 'desc' }
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

module.exports = router;