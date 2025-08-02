# 🏦 Finance Tracker - Complete Splitwise Competitor

A comprehensive multi-account finance tracker with advanced features including group expenses, lending/borrowing, OCR receipt processing, and real-time notifications.

## ⚡ Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- Git (optional, for cloning)

### Single-Click Launch 🚀
```bash
# Clone the repository (if needed)
git clone <your-repo-url>
cd simple

# Start all services
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/v1/
- **Admin Panel**: http://localhost:8000/admin/

### Initial Setup
1. Access the frontend at http://localhost:3000
2. Register a new account
3. Start tracking your finances!

## 🏗️ Architecture

### Services
- **Frontend**: React + TypeScript (Port 3000)
- **Backend**: Django REST API (Port 8000)
- **Database**: PostgreSQL (Port 5432)
- **Cache/Queue**: Redis (Port 6379)
- **Background Tasks**: Celery Worker

### Features
- ✅ Multi-account personal finance tracking
- ✅ Group expense splitting (Splitwise-style)
- ✅ Lending/borrowing with Khata book interface
- ✅ OCR receipt processing
- ✅ Smart transaction categorization
- ✅ Real-time notifications
- ✅ Comprehensive analytics
- ✅ Goal tracking and budgets
- ✅ Mobile-responsive PWA

## 🛠️ Development

### Local Development Setup
```bash
# Start in development mode
docker-compose up

# Access services
docker-compose exec backend python manage.py shell
docker-compose exec frontend npm run build

# View logs
docker-compose logs backend
docker-compose logs frontend

# Restart specific service
docker-compose restart backend
```

### Database Management
```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Load sample data
docker-compose exec backend python manage.py create_sample_data
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (reset database)
docker-compose down -v
```

## 📊 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Query** for state management
- **PWA** capabilities

### Backend
- **Django 5.2** with REST Framework
- **PostgreSQL** database
- **Redis** for caching and queues
- **Celery** for background tasks
- **Tesseract OCR** for receipt processing
- **JWT** authentication

### DevOps
- **Docker** containerization
- **Docker Compose** for orchestration
- **Multi-stage builds** for optimization
- **Health checks** for reliability

## 🔧 Configuration

### Environment Variables
Edit `.env` file to customize:
- Database credentials
- API URLs
- Feature flags
- Security settings

### Adding New Features
1. Backend changes: Edit files in `backend/core/`
2. Frontend changes: Edit files in `finance-tracker/src/`
3. Rebuild containers: `docker-compose up --build`

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in `docker-compose.yml`
2. **Database connection**: Check PostgreSQL health status
3. **Permission issues**: Run `docker-compose down -v` to reset

### Logs and Debugging
```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Enter container for debugging
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 📈 Production Deployment

### Production Setup
```bash
# Use production profile
docker-compose --profile production up -d

# Or with custom environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Security Considerations
- Change default passwords
- Use HTTPS (add SSL certificates)
- Configure proper CORS origins
- Set secure SECRET_KEY
- Enable database backups

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test with Docker
4. Commit changes: `git commit -m 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Happy Tracking! 💰**