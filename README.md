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



## 🗄️ Database Schema


**Full Schema**: [https://github.com/Preome/urban-farming-platform/blob/main/prisma/schema.prisma](https://github.com/Preome/urban-farming-platform/blob/main/prisma/schema.prisma)  
**Migrations**: [https://github.com/Preome/urban-farming-platform/tree/main/prisma/migrations](https://github.com/Preome/urban-farming-platform/tree/main/prisma/migrations)

## 🌱 Seeder Script


`prisma/seed.js` populates:
- **3 Roles**: 1 Admin, 10 Vendors (full profiles), 5+ Customers
- **100 Products**: Across categories (Vegetables, Fruits, Herbs, etc.) with pricing/availability
- **Sample Data**: Rental spaces, community posts (30+), plant trackings, certifications

**Link**: [https://github.com/Preome/urban-farming-platform/blob/main/prisma/seed.js](https://github.com/Preome/urban-farming-platform/blob/main/prisma/seed.js)

```bash
node prisma/seed.js
```




## 📚 API Documentation & Testing

### Swagger Testing
- Spec file : [swagger.yaml](swagger.yaml)
- Swagger collection with sample request and response : https://docs.google.com/document/d/11KRyJPEL67liSUB2KhqsZlF0scEvGvhizUw-W-bJM_E/edit?tab=t.0


## ⚡ API Response Control & Performance Strategy
[PERFORMANCE_STRATEGY.md](PERFORMANCE_STRATEGY.md)


## 📊 Benchmark Report

Performance metrics & load testing results:  
[📈 BENCHMARK_REPORT.md](BENCHMARK_REPORT.md)

## 🔗 GitHub

- Repository: https://github.com/yourusername/urban-farming-platform (update with actual)
- Issues: https://github.com/yourusername/urban-farming-platform/issues
- Stars: ![Stars](https://img.shields.io/github/stars/yourusername/urban-farming-platform)




