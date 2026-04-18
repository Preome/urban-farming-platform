# 🌱 Urban Farming Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-00d1b2.svg)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-purple.svg)](https://postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.5-red.svg)](https://socket.io/)

## 📖 Project Description

**Interactive Urban Farming Platform** - A full-stack backend API enabling urban farmers, vendors, and customers to connect for sustainable agriculture in cities. Features include produce marketplace, rental spaces, plant tracking with real-time updates, community forum, and sustainability certifications.

### ✨ Key Features
- **User Roles**: Admin, Vendor (10+), Customer 
- **Marketplace**: 100+ products, organic certifications
- **Rentals**: Farm plot/space bookings with GPS
- **Real-time**: Socket.io plant health updates
- **Community**: Forum posts & comments
- **Tracking**: Plant growth with health status
- **Admin Dashboard**: Orders, certifications, users

## 🛠️ Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Backend | Node.js + Express | v20 / 4.18 |
| Database | PostgreSQL + Prisma ORM | 16 / 5.22 |
| Auth | JWT + bcrypt | 9.0 / 2.4 |
| Real-time | Socket.io | 4.5 |
| Docs | Swagger UI | 5.0 |
| Rate Limiting | express-rate-limit | 7.1 |
| Security | helmet, cors | Latest |

## 🚀 Quick Start

1. **Clone & Install**
```bash
git clone <your-repo-url>
cd "Urban Farming Platform"
npm install
```

2. **Environment Setup** (.env)
```
DATABASE_URL="postgresql://user:pass@localhost:5432/urbanfarming?schema=public"
JWT_SECRET="your-super-secret-key"
PORT=3000
```

3. **Database & Migrations**
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Seed Data** (3 roles, 10 vendors, 100+ products)
```bash
npm run seed
```

5. **Run Server**
```bash
npm run dev  # Development with nodemon
# or
npm start    # Production
```

🌐 **Swagger Docs**: http://localhost:3000/api-docs  


## 🗄️ Database Schema

**Key Models** (14 tables):
```
User (Roles: ADMIN/VENDOR/CUSTOMER) → VendorProfile → Produce (100+ items)
                       ↓
RentalSpace ← RentalBooking
                       ↓
Order → OrderItem
CommunityPost → CommunityComment
PlantTracking → PlantHealthUpdate
SustainabilityCert
```

**Full Schema**: [prisma/schema.prisma](prisma/schema.prisma)  
**Migrations**: [prisma/migrations/](prisma/migrations/)

## 🌱 Seeder Script

`prisma/seed.js` populates:
- **3 Roles**: 1 Admin, 10 Vendors (full profiles), 5+ Customers
- **100 Products**: Across categories (Vegetables, Fruits, Herbs, etc.) with pricing/availability
- **Sample Data**: Rental spaces, community posts (30+), plant trackings, certifications

```bash
node prisma/seed.js
```

## 📚 API Documentation & Testing

### Swagger/OpenAPI
- Live Docs: http://localhost:3000/api-docs
- Spec: [swagger.yaml](swagger.yaml)

### Postman Collection
- Import: [Urban_Farming_Platform.postman_collection.json](postman/Urban_Farming_Platform.postman_collection.json)
- Sample requests: Auth, Produce listing, Orders, Community posts

**Sample Request** (Register):
```
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "securepass123"
}
```

## ⚡ API Response Control & Performance Strategy

**Standardized Responses**:
```json
{
  "success": true,
  "message": "Success message",
  "data": {...},
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

**Performance Optimizations** (see [PERFORMANCE_STRATEGY.md](PERFORMANCE_STRATEGY.md)):
- Prisma query optimization & select fields
- Rate limiting (`middleware/rateLimiter.js`)
- Pagination on all list endpoints
- Database indexing
- Response caching strategies

## 📊 Benchmark Report

Performance metrics & load testing results:  
[📈 BENCHMARK_REPORT.md](BENCHMARK_REPORT.md)

## 🔗 GitHub

- Repository: https://github.com/yourusername/urban-farming-platform (update with actual)
- Issues: https://github.com/yourusername/urban-farming-platform/issues
- Stars: ![Stars](https://img.shields.io/github/stars/yourusername/urban-farming-platform)




