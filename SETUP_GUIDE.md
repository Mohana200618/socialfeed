# Fisherman Safety Application - Setup Guide

This is a complete mobile application for fisherman safety with role-based dashboards for fishermen, volunteers, and administrators.

## Application Structure

```
blue/
├── backend/          # Node.js + Express REST API
├── mobile/           # Flutter mobile application
└── web/              # Web frontend (optional)
```

## Features by Role

### Fisherman Dashboard
- Real-time weather information (top left)
- Compass for navigation (top right)
- Top 3 alerts (color-coded: red/yellow/green)
- Report incident button
- Social feed
- SOS emergency button (bottom right)
- Navigation drawer: User profile, Fishing zone, Cluster, Border alert, Warning alert, Tidal prediction
- Settings: Language, Volume, Brightness

### Volunteer Dashboard
- Weather widget
- Four main functions:
  - Report incident
  - Social feed
  - Cluster management
  - View alerts

### Admin Dashboard
- Five management functions:
  - Social feed management
  - Incident management (status updates)
  - Cluster management
  - Manage alerts
  - Send alerts

## Prerequisites

### Backend
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Mobile
- Flutter SDK (3.9.2 or higher)
- Dart SDK (comes with Flutter)
- Android Studio or VS Code with Flutter extensions
- For iOS: Xcode (macOS only)

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=fisherman_safety

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

CORS_ORIGIN=http://localhost:3000
```

### 3. Setup Database

Create the PostgreSQL database:

```bash
psql -U postgres
CREATE DATABASE fisherman_safety;
\q
```

Run the database schema:

```bash
psql -U postgres -d fisherman_safety -f database.sql
```

### 4. Start the Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:5000`

### 5. Test the API

```bash
# Check if server is running
curl http://localhost:5000/api/auth/

# You should see a response indicating the auth endpoint is working
```

## Mobile App Setup

### 1. Install Flutter Dependencies

```bash
cd mobile
flutter pub get
```

### 2. Configure API Endpoint

Edit `lib/config/api_config.dart`:

For Android emulator:
```dart
static const String baseUrl = 'http://10.0.2.2:5000/api';
```

For iOS simulator:
```dart
static const String baseUrl = 'http://localhost:5000/api';
```

For physical device (replace with your computer's IP):
```dart
static const String baseUrl = 'http://192.168.1.x:5000/api';
```

To find your IP address:
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr`

### 3. Run the App

```bash
# List available devices
flutter devices

# Run on connected device/emulator
flutter run

# Run in release mode (better performance)
flutter run --release
```

### 4. Build APK (Android)

```bash
# Build APK
flutter build apk

# Build split APKs by ABI (smaller file size)
flutter build apk --split-per-abi

# APK will be at: build/app/outputs/flutter-apk/app-release.apk
```

### 5. Build iOS App (macOS only)

```bash
flutter build ios

# Or open in Xcode
open ios/Runner.xcworkspace
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (username or phone)
- `GET /api/auth/me` - Get current user

### Alerts
- `GET /api/alerts` - Get all alerts
- `GET /api/alerts/top` - Get top 3 alerts by severity
- `POST /api/alerts` - Create alert (admin only)

### Incidents
- `GET /api/incidents` - Get all incidents
- `POST /api/incidents` - Report incident
- `PUT /api/incidents/:id` - Update incident status (admin only)

### Social Feed
- `GET /api/social-feed` - Get all posts
- `POST /api/social-feed` - Create post

### Clusters
- `GET /api/clusters` - Get all clusters
- `POST /api/clusters` - Create cluster

### Fishing Zones
- `GET /api/fishing-zones` - Get all zones
- `POST /api/fishing-zones` - Create zone (admin only)

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings

## Default Test Users

After database setup, you can create test users:

```bash
# Fisherman
Username: fisherman1
Phone: 1234567890
Password: password123
Role: fisherman

# Volunteer
Username: volunteer1
Phone: 2345678901
Password: password123
Role: volunteer

# Admin
Username: admin1
Phone: 3456789012
Password: password123
Role: admin
```

Register these through the app or use API:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "fisherman1",
    "phoneNumber": "1234567890",
    "password": "password123",
    "role": "fisherman"
  }'
```

## Troubleshooting

### Backend Issues

**Database connection error:**
- Check PostgreSQL is running: `sudo systemctl status postgresql` (Linux) or check Services (Windows)
- Verify credentials in `.env` file
- Ensure database exists: `psql -U postgres -l`

**Port already in use:**
- Change PORT in `.env` to another port (e.g., 5001)
- Kill process using port 5000: 
  - Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`
  - Mac/Linux: `lsof -ti:5000 | xargs kill`

### Mobile App Issues

**Network error / Cannot connect to API:**
- Check backend server is running
- Verify correct IP address in `api_config.dart`
- For Android emulator, use `10.0.2.2` not `localhost`
- Check firewall settings allow connections

**Build errors:**
- Run `flutter clean` then `flutter pub get`
- Update Flutter: `flutter upgrade`
- Check Flutter doctor: `flutter doctor`

**Permission errors (Location/Camera):**
- For Android: Permissions are in `android/app/src/main/AndroidManifest.xml`
- For iOS: Permissions are in `ios/Runner/Info.plist`
- Grant permissions when app prompts on first run

## Development Tips

### Hot Reload (Flutter)
- Press `r` in terminal for hot reload
- Press `R` for hot restart
- Press `q` to quit

### Backend Development
- Use `npm run dev` for auto-reload with nodemon
- Check logs in terminal for errors
- Use Postman or Thunder Client to test API endpoints

### Database Management
- View tables: `psql -U postgres -d fisherman_safety -c "\dt"`
- Query data: `psql -U postgres -d fisherman_safety -c "SELECT * FROM users;"`
- Reset database: Re-run `database.sql` file

## Project Structure

### Backend (`backend/src/`)
```
src/
├── config/          # Configuration files (database, JWT)
├── controllers/     # Request handlers
├── middleware/      # Authentication, error handling
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Helper functions
└── validators/      # Input validation
```

### Mobile (`mobile/lib/`)
```
lib/
├── config/          # API configuration
├── services/        # API services, auth, models
├── components/      # Reusable widgets
└── pages/           # Screen UI
    ├── login_page.dart
    ├── register_page.dart
    ├── fisherman_dashboard.dart
    ├── volunteer_dashboard.dart
    ├── admin_dashboard.dart
    └── ... (other pages)
```

## Next Steps

1. ✅ Backend setup complete
2. ✅ Database schema created
3. ✅ Mobile app configured
4. ⏳ Test user registration and login
5. ⏳ Test role-based dashboards
6. ⏳ Implement real weather API integration
7. ⏳ Add push notifications for alerts
8. ⏳ Implement real-time updates with WebSockets
9. ⏳ Deploy to production server
10. ⏳ Publish to Google Play Store / Apple App Store

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review error logs in backend terminal and Flutter console
3. Ensure all dependencies are installed correctly
4. Verify database is properly set up with all tables

## License

This project is developed for fisherman safety purposes.
