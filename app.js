const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make prisma available in routes
app.set('prisma', prisma);

// Simple logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ============= AUTHENTICATION ROUTES =============

// Register
app.post('/api/auth/register', async (req, res) => {
    console.log('✅ Register endpoint HIT!');
    console.log('Request body:', req.body);
    
    try {
        const { name, email, password, role = 'CUSTOMER' } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }
        
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role.toUpperCase(),
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true
            }
        });
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secretkey123',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, token }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    console.log('✅ Login endpoint HIT!');
    console.log('Request body:', req.body);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        const user = await prisma.user.findUnique({
            where: { email },
            include: { vendorProfile: true }
        });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secretkey123',
            { expiresIn: '7d' }
        );
        
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            message: 'Login successful',
            data: { user: userWithoutPassword, token }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= PRODUCT ROUTES =============

// Get all products
app.get('/api/produce', async (req, res) => {
    console.log('✅ Products endpoint HIT!');
    try {
        const { category, minPrice, maxPrice, organic, search } = req.query;
        
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
        
        const produce = await prisma.produce.findMany({
            where,
            include: {
                vendor: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                }
            },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({ success: true, data: produce });
    } catch (error) {
        console.error('Products error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single product
app.get('/api/produce/:id', async (req, res) => {
    try {
        const produce = await prisma.produce.findUnique({
            where: { id: req.params.id },
            include: {
                vendor: {
                    include: { user: { select: { name: true, email: true } } }
                }
            }
        });
        
        if (!produce) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        res.json({ success: true, data: produce });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= RENTAL SPACE ROUTES =============

// Get all rental spaces
app.get('/api/rentals', async (req, res) => {
    console.log('✅ Rentals endpoint HIT!');
    try {
        const { location, minPrice, maxPrice, minSize } = req.query;
        
        const where = { availability: true };
        if (location) where.location = { contains: location, mode: 'insensitive' };
        if (minPrice) where.pricePerMonth = { gte: parseFloat(minPrice) };
        if (maxPrice) where.pricePerMonth = { ...where.pricePerMonth, lte: parseFloat(maxPrice) };
        if (minSize) where.size = { gte: parseFloat(minSize) };
        
        const rentals = await prisma.rentalSpace.findMany({
            where,
            include: {
                vendor: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { pricePerMonth: 'asc' }
        });
        
        res.json({ success: true, data: rentals });
    } catch (error) {
        console.error('Rentals error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single rental space
app.get('/api/rentals/:id', async (req, res) => {
    try {
        const rental = await prisma.rentalSpace.findUnique({
            where: { id: req.params.id },
            include: {
                vendor: {
                    include: { user: { select: { name: true, email: true } } }
                }
            }
        });
        
        if (!rental) {
            return res.status(404).json({ success: false, message: 'Rental space not found' });
        }
        
        res.json({ success: true, data: rental });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Book a rental space
app.post('/api/rentals/:id/book', async (req, res) => {
    console.log('✅ Book rental endpoint HIT!');
    try {
        const { startDate, endDate, userId } = req.body;
        
        const rentalSpace = await prisma.rentalSpace.findUnique({
            where: { id: req.params.id }
        });
        
        if (!rentalSpace || !rentalSpace.availability) {
            return res.status(404).json({ success: false, message: 'Rental space not available' });
        }
        
        const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
        const totalPrice = rentalSpace.pricePerMonth * (days / 30);
        
        // Find a user if userId not provided
        let targetUserId = userId;
        if (!targetUserId) {
            const defaultUser = await prisma.user.findFirst();
            targetUserId = defaultUser?.id;
        }
        
        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'User ID required' });
        }
        
        const booking = await prisma.rentalBooking.create({
            data: {
                userId: targetUserId,
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
        console.error('Booking error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= ORDER ROUTES =============

// Get orders
app.get('/api/orders', async (req, res) => {
    console.log('✅ Orders endpoint HIT!');
    try {
        const orders = await prisma.order.findMany({
            include: {
                items: { include: { produce: true } },
                user: { select: { name: true, email: true } }
            },
            take: 20
        });
        
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create order
app.post('/api/orders', async (req, res) => {
    console.log('✅ Create order endpoint HIT!');
    try {
        const { items, shippingAddress, userId } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order must have at least one item' });
        }
        
        // Find a user if userId not provided
        let targetUserId = userId;
        if (!targetUserId) {
            const defaultUser = await prisma.user.findFirst();
            targetUserId = defaultUser?.id;
        }
        
        let totalAmount = 0;
        const orderItems = [];
        let vendorId = null;
        
        for (const item of items) {
            const produce = await prisma.produce.findUnique({
                where: { id: item.produceId }
            });
            
            if (!produce) {
                return res.status(404).json({ success: false, message: `Product ${item.produceId} not found` });
            }
            
            if (!vendorId) vendorId = produce.vendorId;
            
            const itemTotal = produce.price * item.quantity;
            totalAmount += itemTotal;
            
            orderItems.push({
                produceId: item.produceId,
                quantity: item.quantity,
                price: produce.price
            });
        }
        
        const order = await prisma.order.create({
            data: {
                userId: targetUserId,
                vendorId: vendorId,
                totalAmount,
                shippingAddress,
                items: { create: orderItems }
            },
            include: { items: { include: { produce: true } } }
        });
        
        res.status(201).json({ success: true, message: 'Order created', data: order });
    } catch (error) {
        console.error('Order error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= COMMUNITY ROUTES =============

// Get community posts
app.get('/api/community/posts', async (req, res) => {
    console.log('✅ Community posts endpoint HIT!');
    try {
        const { category, page = 1, limit = 10 } = req.query;
        
        const where = {};
        if (category) where.category = category;
        
        const posts = await prisma.communityPost.findMany({
            where,
            include: {
                user: { select: { id: true, name: true } },
                comments: {
                    include: { user: { select: { name: true } } },
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                },
                _count: { select: { comments: true } }
            },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({ success: true, data: posts });
    } catch (error) {
        console.error('Community error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create post
app.post('/api/community/posts', async (req, res) => {
    console.log('✅ Create post endpoint HIT!');
    try {
        const { title, postContent, category, userId } = req.body;
        
        let targetUserId = userId;
        if (!targetUserId) {
            const defaultUser = await prisma.user.findFirst();
            targetUserId = defaultUser?.id;
        }
        
        const post = await prisma.communityPost.create({
            data: {
                userId: targetUserId,
                title,
                postContent,
                category
            },
            include: { user: { select: { name: true } } }
        });
        
        res.status(201).json({ success: true, message: 'Post created', data: post });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Like a post
app.post('/api/community/posts/:id/like', async (req, res) => {
    try {
        const post = await prisma.communityPost.update({
            where: { id: req.params.id },
            data: { likes: { increment: 1 } }
        });
        
        res.json({ success: true, message: 'Post liked', data: { likes: post.likes } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add comment
app.post('/api/community/posts/:id/comments', async (req, res) => {
    try {
        const { comment, userId } = req.body;
        
        let targetUserId = userId;
        if (!targetUserId) {
            const defaultUser = await prisma.user.findFirst();
            targetUserId = defaultUser?.id;
        }
        
        const newComment = await prisma.communityComment.create({
            data: {
                postId: req.params.id,
                userId: targetUserId,
                comment
            },
            include: { user: { select: { name: true } } }
        });
        
        res.status(201).json({ success: true, message: 'Comment added', data: newComment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= PLANT TRACKING ROUTES =============

// Get plants
app.get('/api/plants', async (req, res) => {
    console.log('✅ Plants endpoint HIT!');
    try {
        const plants = await prisma.plantTracking.findMany({
            include: { healthUpdates: { take: 5, orderBy: { createdAt: 'desc' } } },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({ success: true, data: plants });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add plant
app.post('/api/plants', async (req, res) => {
    console.log('✅ Add plant endpoint HIT!');
    try {
        const { plantName, plantType, plantingDate, expectedHarvestDate, healthStatus, notes, userId } = req.body;
        
        let targetUserId = userId;
        if (!targetUserId) {
            const defaultUser = await prisma.user.findFirst();
            targetUserId = defaultUser?.id;
        }
        
        const plant = await prisma.plantTracking.create({
            data: {
                userId: targetUserId,
                plantName,
                plantType,
                plantingDate: new Date(plantingDate),
                expectedHarvestDate: new Date(expectedHarvestDate),
                healthStatus,
                notes
            }
        });
        
        res.status(201).json({ success: true, message: 'Plant added', data: plant });
    } catch (error) {
        console.error('Add plant error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update plant health
app.patch('/api/plants/:id/health', async (req, res) => {
    console.log('✅ Update plant health endpoint HIT!');
    try {
        const { healthStatus, notes } = req.body;
        
        const plant = await prisma.plantTracking.update({
            where: { id: req.params.id },
            data: { healthStatus }
        });
        
        const healthUpdate = await prisma.plantHealthUpdate.create({
            data: {
                plantTrackingId: plant.id,
                healthStatus,
                notes
            }
        });
        
        res.json({ success: true, message: 'Health updated', data: { plant, healthUpdate } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= ADMIN ROUTES =============

// Admin dashboard
app.get('/api/admin/dashboard', async (req, res) => {
    console.log('✅ Admin dashboard HIT!');
    try {
        const [totalUsers, totalVendors, totalCustomers, totalOrders, totalProducts] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'VENDOR' } }),
            prisma.user.count({ where: { role: 'CUSTOMER' } }),
            prisma.order.count(),
            prisma.produce.count()
        ]);
        
        res.json({
            success: true,
            data: {
                users: { total: totalUsers, vendors: totalVendors, customers: totalCustomers },
                orders: { total: totalOrders },
                products: { total: totalProducts }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= CERTIFICATION ROUTES =============

// Get certifications
app.get('/api/certifications', async (req, res) => {
    console.log('✅ Certifications endpoint HIT!');
    try {
        const certs = await prisma.sustainabilityCert.findMany({
            include: { vendor: { include: { user: { select: { name: true } } } } }
        });
        
        res.json({ success: true, data: certs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= USER ROUTES =============

// Get user profile
app.get('/api/users/profile', async (req, res) => {
    console.log('✅ User profile endpoint HIT!');
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true
            }
        });
        
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============= TEST ROUTE =============
app.get('/test', (req, res) => {
    res.json({ success: true, message: 'Server is working!', timestamp: new Date() });
});

// ============= ROOT ENDPOINT =============
app.get('/', (req, res) => {
    res.json({
        name: 'Urban Farming Platform API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            auth: 'POST /api/auth/register, POST /api/auth/login',
            products: 'GET /api/produce',
            rentals: 'GET /api/rentals',
            orders: 'GET /api/orders, POST /api/orders',
            community: 'GET /api/community/posts, POST /api/community/posts',
            plants: 'GET /api/plants, POST /api/plants',
            admin: 'GET /api/admin/dashboard',
            certifications: 'GET /api/certifications',
            users: 'GET /api/users/profile'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`,
        availableRoutes: [
            'GET  /',
            'GET  /test',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET  /api/produce',
            'GET  /api/rentals',
            'GET  /api/orders',
            'POST /api/orders',
            'GET  /api/community/posts',
            'POST /api/community/posts',
            'GET  /api/plants',
            'POST /api/plants',
            'GET  /api/admin/dashboard',
            'GET  /api/certifications',
            'GET  /api/users/profile'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 ========================================`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🚀 ========================================`);
    console.log(`\n📝 Available endpoints:`);
    console.log(`   POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   GET  http://localhost:${PORT}/api/produce`);
    console.log(`   GET  http://localhost:${PORT}/api/rentals`);
    console.log(`   GET  http://localhost:${PORT}/api/orders`);
    console.log(`   GET  http://localhost:${PORT}/api/community/posts`);
    console.log(`   GET  http://localhost:${PORT}/api/plants`);
    console.log(`   GET  http://localhost:${PORT}/api/admin/dashboard`);
    console.log(`   GET  http://localhost:${PORT}/api/certifications`);
    console.log(`\n✨ Test with Postman now!\n`);
});