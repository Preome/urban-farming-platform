const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get all posts with pagination
router.get('/posts', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { page = 1, limit = 20, category, search } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const where = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { postContent: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.communityPost.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        items: posts,
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

// Create post
router.post('/posts', authMiddleware, strictLimiter, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { title, postContent, category } = req.body;
    
    const post = await prisma.communityPost.create({
      data: {
        userId: req.user.id,
        title,
        postContent,
        category
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single post
router.get('/posts/:id', async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const post = await prisma.communityPost.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Like/Unlike post
router.post('/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    
    const post = await prisma.communityPost.findUnique({
      where: { id: req.params.id }
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const updatedPost = await prisma.communityPost.update({
      where: { id: req.params.id },
      data: {
        likes: { increment: 1 }
      }
    });
    
    res.json({
      success: true,
      message: 'Post liked',
      data: { likes: updatedPost.likes }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add comment
router.post('/posts/:id/comments', authMiddleware, strictLimiter, async (req, res) => {
  try {
    const prisma = req.app.get('prisma');
    const { comment } = req.body;
    
    const post = await prisma.communityPost.findUnique({
      where: { id: req.params.id }
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const newComment = await prisma.communityComment.create({
      data: {
        postId: req.params.id,
        userId: req.user.id,
        comment
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Comment added',
      data: newComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;