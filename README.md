# EventFlow Backend

A robust and scalable event management and ticketing platform built with Node.js, Express, TypeScript, and Prisma.

## 🚀 Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Event Management**: Complete CRUD operations for events with advanced search and filtering
- **Ticket Booking System**: Secure ticket purchasing with Stripe payment integration
- **File Upload**: Image and media management using Supabase storage
- **Email Notifications**: Automated email service for user communications
- **Payment Processing**: Integrated Stripe payment gateway for secure transactions
- **QR Code Generation**: Ticket verification with QR codes
- **Advanced Search**: Filter events by category, date, location, and more
- **Pagination**: Efficient data handling with paginated responses

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Payment**: Stripe
- **Storage**: Supabase
- **Validation**: Zod
- **Package Manager**: pnpm or npm or bun

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- pnpm (v8 or higher)

## 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/eventflow-backend.git
cd eventflow-backend/backend
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Environment Setup**

Create a `.env` file in the backend directory by copying `.env.example`:
```bash
cp .env.example .env
```

Configure the following environment variables:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/eventflow"

# JWT
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_REFRESH_EXPIRES_IN="30d"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_key"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-key"
SUPABASE_BUCKET="event-images"

# Email Service
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# Application
PORT=5000
NODE_ENV="development"
CLIENT_URL="http://localhost:3000"
```

4. **Database Setup**

Run Prisma migrations:
```bash
pnpm prisma migrate dev
```

Generate Prisma Client:
```bash
pnpm prisma generate
```

(Optional) Seed the database:
```bash
pnpm prisma db seed
```

5. **Start the development server**
```bash
pnpm dev
```

The server will start on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── errors/            # Custom error classes
│   │   ├── helpers/           # Helper utilities
│   │   ├── middlewares/       # Express middlewares
│   │   ├── modules/           # Feature modules
│   │   │   ├── auth/          # Authentication
│   │   │   ├── event/         # Event management
│   │   │   ├── ticket/        # Ticket booking
│   │   │   └── user/          # User management
│   │   └── shared/            # Shared utilities
│   ├── config/                # Configuration
│   ├── middleware/            # Additional middlewares
│   ├── routes/                # Route definitions
│   ├── shared/                # Shared services
│   ├── types/                 # TypeScript types
│   ├── utils/                 # Utility functions
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Server entry point
│   └── index.ts               # Main entry point
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users/profile` - Get user profile (Auth required)
- `PUT /api/users/profile` - Update user profile (Auth required)
- `GET /api/users` - Get all users (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

### Events
- `GET /api/events` - Get all events (with filters)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (Organizer only)
- `PUT /api/events/:id` - Update event (Organizer only)
- `DELETE /api/events/:id` - Delete event (Organizer only)
- `GET /api/events/search` - Advanced search
- `GET /api/events/category/:category` - Filter by category

### Tickets
- `POST /api/tickets/book` - Book a ticket (Auth required)
- `GET /api/tickets/my-tickets` - Get user tickets (Auth required)
- `GET /api/tickets/:id` - Get ticket details (Auth required)
- `POST /api/tickets/:id/cancel` - Cancel ticket (Auth required)
- `GET /api/tickets/:id/verify` - Verify ticket QR code

### Health
- `GET /api/health` - Health check endpoint

## 🔐 Authentication Flow

1. User registers or logs in
2. Server generates JWT access token (7 days) and refresh token (30 days)
3. Client stores tokens securely
4. Client includes access token in Authorization header: `Bearer <token>`
5. Server validates token on protected routes
6. Client can refresh expired tokens using refresh token

## 💳 Payment Flow

1. User selects tickets and proceeds to checkout
2. Frontend creates Stripe payment intent
3. User completes payment through Stripe
4. Backend verifies payment and creates ticket
5. User receives ticket confirmation email
6. QR code generated for ticket verification

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## 🏗️ Building for Production

```bash
# Build the project
pnpm build

# Start production server
pnpm start
```

## 📝 Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm prisma:generate` - Generate Prisma Client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Role-based access control (RBAC)
- Request validation with Zod
- SQL injection prevention with Prisma
- XSS protection
- CORS configuration
- Rate limiting
- Helmet.js security headers

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `JWT_EXPIRES_IN` | Access token expiration | Yes |
| `STRIPE_SECRET_KEY` | Stripe API secret key | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase API key | Yes |
| `EMAIL_USER` | Email service username | Yes |
| `EMAIL_PASSWORD` | Email service password | Yes |
| `PORT` | Server port number | No |
| `NODE_ENV` | Environment (development/production) | No |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Your Name** - *Initial work* - [GitHub](https://github.com/rashedul-dev)

## 🙏 Acknowledgments

- Express.js community
- Prisma team
- Stripe API documentation
- All contributors who helped with this project

## 📞 Support

For support, email rashedulislam.edge@gmail.com 

## 🗺️ Roadmap

- [ ] WebSocket integration for real-time updates
- [ ] Event analytics dashboard
- [ ] Mobile app API optimization
- [ ] GraphQL API support
- [ ] Multi-language support
- [ ] Event recommendation system
- [ ] Social media integration
- [ ] Advanced reporting features

---

**Built with ❤️ by the Rashedul**