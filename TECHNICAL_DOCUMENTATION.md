# Fisherman Safety Application - Technical Documentation

## Overview
A full-stack mobile application for fisherman safety with three role-based interfaces: Fisherman, Volunteer, and Admin. The system provides real-time alerts, incident reporting, social features, and cluster management.

## Technology Stack

### Backend
- **Framework**: Node.js with Express 4.18.2
- **Database**: PostgreSQL with pg 8.11.3
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcryptjs 2.4.3
- **Validation**: express-validator 7.0.1
- **Middleware**: Custom auth, error handling, rate limiting

### Mobile
- **Framework**: Flutter 3.9.2 SDK
- **State Management**: Provider 6.1.1
- **HTTP Client**: http 1.1.0
- **Local Storage**: shared_preferences 2.2.2
- **Location**: geolocator 10.1.0, flutter_compass 0.8.0
- **UI Libraries**: cached_network_image 3.3.0, flutter_svg 2.0.9, intl 0.19.0

## Database Schema

### Core Tables

#### users
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR 100, UNIQUE, NOT NULL)
- phone_number (VARCHAR 20, UNIQUE, NOT NULL)
- password (VARCHAR 255, NOT NULL)
- role (VARCHAR 50, CHECK IN ('fisherman','volunteer','admin'))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### alerts
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR 255, NOT NULL)
- description (TEXT)
- alert_type (VARCHAR 50) -- border, warning, tidal, weather
- severity (VARCHAR 20, CHECK IN ('red','yellow','green'))
- location (VARCHAR 255)
- latitude (DECIMAL 10,7)
- longitude (DECIMAL 10,7)
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP)
- created_by (INTEGER, FK users)
```

#### incidents
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR 255, NOT NULL)
- description (TEXT)
- incident_type (VARCHAR 50)
- status (VARCHAR 50, DEFAULT 'pending') -- pending, investigating, resolved, closed
- location (VARCHAR 255)
- latitude (DECIMAL 10,7)
- longitude (DECIMAL 10,7)
- reported_by (INTEGER, FK users, NOT NULL)
- assigned_to (INTEGER, FK users)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### social_feed
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER, FK users, NOT NULL)
- content (TEXT, NOT NULL)
- image_url (VARCHAR 500)
- likes (INTEGER, DEFAULT 0)
- comments_count (INTEGER, DEFAULT 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### clusters
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR 255, NOT NULL)
- description (TEXT)
- leader_id (INTEGER, FK users)
- member_count (INTEGER, DEFAULT 0)
- location (VARCHAR 255)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### fishing_zones
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR 255, NOT NULL)
- description (TEXT)
- zone_type (VARCHAR 50)
- coordinates (TEXT) -- JSON array of lat/lng
- is_restricted (BOOLEAN, DEFAULT false)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### weather_data
```sql
- id (SERIAL PRIMARY KEY)
- location (VARCHAR 255, NOT NULL)
- temperature (DECIMAL 5,2)
- weather_condition (VARCHAR 100)
- wind_speed (DECIMAL 5,2)
- wind_direction (VARCHAR 10)
- humidity (DECIMAL 5,2)
- pressure (DECIMAL 6,2)
- recorded_at (TIMESTAMP, NOT NULL)
- created_at (TIMESTAMP)
```

#### user_settings
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER, FK users, UNIQUE, NOT NULL)
- language (VARCHAR 10, DEFAULT 'en')
- volume (INTEGER, DEFAULT 50, CHECK 0-100)
- brightness (INTEGER, DEFAULT 50, CHECK 0-100)
- notifications_enabled (BOOLEAN, DEFAULT true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Backend API Structure

### Authentication Endpoints (`/api/auth`)

#### POST /api/auth/register
```json
Request:
{
  "username": "string",
  "phoneNumber": "string",
  "password": "string",
  "role": "fisherman|volunteer|admin"
}

Response:
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": 1,
    "username": "string",
    "phoneNumber": "string",
    "role": "string"
  }
}
```

#### POST /api/auth/login
```json
Request:
{
  "identifier": "username_or_phone",
  "password": "string"
}

Response:
{
  "success": true,
  "token": "jwt_token",
  "user": {...}
}
```

#### GET /api/auth/me
Protected route - requires Bearer token
```json
Response:
{
  "success": true,
  "user": {
    "id": 1,
    "username": "string",
    "phoneNumber": "string",
    "role": "string"
  }
}
```

### Alert Endpoints (`/api/alerts`)

#### GET /api/alerts
```json
Response:
{
  "success": true,
  "alerts": [
    {
      "id": 1,
      "title": "High Tide Warning",
      "description": "...",
      "alertType": "tidal",
      "severity": "red",
      "location": "Bay Area",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/alerts/top
Returns top 3 alerts sorted by severity (red > yellow > green)

#### POST /api/alerts (Admin only)
```json
Request:
{
  "title": "string",
  "description": "string",
  "alertType": "border|warning|tidal|weather",
  "severity": "red|yellow|green",
  "location": "string",
  "latitude": 12.345678,
  "longitude": 98.765432,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### Incident Endpoints (`/api/incidents`)

#### GET /api/incidents
Protected route

#### POST /api/incidents
```json
Request:
{
  "title": "string",
  "description": "string",
  "incidentType": "string",
  "location": "string",
  "latitude": 12.345678,
  "longitude": 98.765432
}
```

#### PUT /api/incidents/:id (Admin/Volunteer only)
```json
Request:
{
  "status": "pending|investigating|resolved|closed"
}
```

### Social Feed Endpoints (`/api/social-feed`)

#### GET /api/social-feed
Protected route

#### POST /api/social-feed
```json
Request:
{
  "content": "string",
  "imageUrl": "string (optional)"
}
```

### Cluster Endpoints (`/api/clusters`)

#### GET /api/clusters
Protected route

#### POST /api/clusters
```json
Request:
{
  "name": "string",
  "description": "string",
  "location": "string"
}
```

### Fishing Zone Endpoints (`/api/fishing-zones`)

#### GET /api/fishing-zones
Public route

#### POST /api/fishing-zones (Admin only)
```json
Request:
{
  "name": "string",
  "description": "string",
  "zoneType": "string",
  "coordinates": "array",
  "isRestricted": false
}
```

### Settings Endpoints (`/api/settings`)

#### GET /api/settings
Protected route
```json
Response:
{
  "success": true,
  "settings": {
    "language": "en",
    "volume": 50,
    "brightness": 50,
    "notificationsEnabled": true
  }
}
```

#### PUT /api/settings
```json
Request:
{
  "language": "en|ta|hi",
  "volume": 0-100,
  "brightness": 0-100
}
```

## Mobile App Architecture

### State Management
Uses Provider pattern with `AuthProvider` for global authentication state.

### Service Layer

#### AuthService (`lib/services/auth_service.dart`)
- `register(username, phoneNumber, password, role)` → User
- `login(identifier, password)` → User
- `saveToken(token)` → void
- `getToken()` → String?
- `saveUser(user)` → void
- `getUser()` → User?
- `clearAuth()` → void
- `isAuthenticated()` → bool

#### ApiService (`lib/services/api_service.dart`)
- `getTopAlerts()` → List<Alert>
- `getAllAlerts()` → List<Alert>
- `createAlert(data)` → Alert
- `getAllIncidents()` → List<Incident>
- `createIncident(data)` → Incident
- `updateIncidentStatus(id, status)` → Incident
- `getSocialFeed()` → List<SocialPost>
- `createPost(data)` → SocialPost
- `getAllClusters()` → List<Cluster>
- `getUserSettings()` → UserSettings
- `updateUserSettings(data)` → UserSettings

### Data Models

#### User
```dart
class User {
  final int id;
  final String username;
  final String phoneNumber;
  final String role;
  
  factory User.fromJson(Map<String, dynamic> json);
  Map<String, dynamic> toJson();
}
```

#### Alert
```dart
class Alert {
  final int id;
  final String title;
  final String description;
  final String alertType;
  final String severity; // red, yellow, green
  final String? location;
  final DateTime createdAt;
}
```

#### Incident
```dart
class Incident {
  final int id;
  final String title;
  final String description;
  final String? incidentType;
  final String status; // pending, investigating, resolved, closed
  final String? location;
  final DateTime createdAt;
}
```

#### SocialPost
```dart
class SocialPost {
  final int id;
  final int userId;
  final String content;
  final String? imageUrl;
  final int likes;
  final int commentsCount;
  final DateTime createdAt;
}
```

### UI Components

#### WeatherWidget (`lib/components/weather_widget.dart`)
Displays:
- Temperature (°C)
- Weather condition
- Wind speed and direction
- Humidity percentage
- Feels like temperature
- Pressure
- Cloud percentage
- Sunrise/Sunset times

#### CompassWidget (`lib/components/compass_widget.dart`)
- Custom painted circular compass
- N/S/E/W cardinal directions
- Red needle pointing north, grey pointing south
- Current direction and degree display

#### AlertCard (`lib/components/alert_card.dart`)
- Color-coded based on severity (red/yellow/green)
- Alert title, description, location
- Timestamp display

#### SocialFeedCard (`lib/components/social_feed_card.dart`)
- User avatar and username
- Post content
- Image display (if present)
- Likes and comments count
- Timestamp

### Pages and Routing

#### Authentication Flow
1. **RegisterPage** (`/register`)
   - Role selection cards (Fisherman, Volunteer, Admin)
   - Username input
   - Phone number input
   - Password and confirm password
   - Form validation
   
2. **LoginPage** (`/login`)
   - Identifier input (accepts username OR phone)
   - Password input
   - Redirects to HomePage after successful login

3. **HomePage** (`/home`)
   - Checks authentication status
   - Routes to role-specific dashboard:
     - Fisherman → FishermanDashboard
     - Volunteer → VolunteerDashboard
     - Admin → AdminDashboard

#### Fisherman Dashboard (`/fisherman`)
**Top Bar:**
- Weather widget (top left)
- Compass widget (top right)
- Three-dot menu (settings, helpline, logout)

**Main Content:**
- Top 3 alerts (color-coded cards)
- Report incident button
- Social feed preview (latest posts)

**Floating Action Button:**
- SOS button (bottom right, red)

**Drawer Navigation:**
- User profile
- Fishing zone
- Cluster
- Border alert
- Warning alert
- Tidal prediction

#### Volunteer Dashboard (`/volunteer`)
**Top Bar:**
- Weather widget
- Three-dot menu

**Main Content:**
- 4-icon grid:
  1. Report Incident (orange)
  2. Social Feed (blue)
  3. Cluster (green)
  4. Alerts (red)

**Drawer:**
- User profile
- Settings

#### Admin Dashboard (`/admin`)
**Top Bar:**
- Three-dot menu (top left)
- Hamburger menu (top right)

**Main Content:**
- 5-icon grid:
  1. Social Feed (blue)
  2. Incident Management (orange)
  3. Cluster (green)
  4. Manage Alerts (red)
  5. Send Alerts (purple)

**Drawer:**
- User profile
- Settings

#### Supporting Pages
- **SettingsPage** (`/settings`): Language, volume, brightness controls
- **UserProfilePage** (`/profile`): Display user info
- **FishingZonePage** (`/fishing-zone`): List of fishing zones
- **ClusterPage** (`/cluster`): List of clusters
- **AlertsPage** (`/alerts`): Filtered alerts by type
- **ReportIncidentPage** (`/report-incident`): Incident report form
- **SocialFeedPage** (`/social-feed`): Full social feed with post creation
- **IncidentManagementPage** (`/incident-management`): Admin incident status management
- **ManageAlertsPage** (`/manage-alerts`): Admin alert creation form

## Authentication Flow

1. User opens app → HomePage checks authentication
2. If not authenticated → Redirect to LoginPage
3. User can:
   - Login with username OR phone number
   - Navigate to RegisterPage
4. After successful login:
   - JWT token stored in SharedPreferences
   - User data stored in SharedPreferences
   - AuthProvider state updated
5. HomePage reads user role and routes to appropriate dashboard
6. Protected API calls include token in Authorization header
7. Logout clears token and user data, redirects to LoginPage

## Security Features

### Backend
- Password hashing with bcryptjs (10 salt rounds)
- JWT token authentication with expiration
- Role-based access control (RBAC)
- Request validation with express-validator
- Protected routes with authenticate middleware
- Admin-only routes with authorize middleware

### Mobile
- Secure token storage with SharedPreferences
- Token automatically included in API requests
- Auto-logout on invalid/expired token
- Role-based UI rendering

## Key Design Decisions

### Flexible Authentication
Users can login with either username OR phone number for convenience. The backend uses a single `identifier` field that queries both columns.

### Role-Based Dashboards
Three distinct UIs tailored to each role's needs:
- Fishermen: Safety-focused with alerts, weather, compass
- Volunteers: Assistance-focused with incident reporting
- Admins: Management-focused with system controls

### Color-Coded Alerts
- **Red**: Critical/Emergency
- **Yellow**: Warning/Caution
- **Green**: Information/Advisory

### Incident Status Workflow
```
pending → investigating → resolved → closed
```

### Settings Persistence
User preferences (language, volume, brightness) stored per user in database, synced across devices.

## API Configuration

### Development
- Backend: `http://localhost:5000`
- Android Emulator: `http://10.0.2.2:5000`
- iOS Simulator: `http://localhost:5000`
- Physical Device: `http://<YOUR_IP>:5000`

### Production
Update `lib/config/api_config.dart` with production server URL.

## Testing Checklist

### Backend
- [ ] Database connection successful
- [ ] User registration works (all 3 roles)
- [ ] Login with username works
- [ ] Login with phone number works
- [ ] JWT token generated on login
- [ ] Protected routes require authentication
- [ ] Role-based authorization works
- [ ] Alert CRUD operations
- [ ] Incident CRUD operations
- [ ] Social feed operations
- [ ] Settings update persists

### Mobile
- [ ] App launches without errors
- [ ] Register page shows all 3 roles
- [ ] Registration creates user in database
- [ ] Login with username succeeds
- [ ] Login with phone number succeeds
- [ ] Routes to correct dashboard based on role
- [ ] Fisherman dashboard shows weather & compass
- [ ] Top 3 alerts display correctly
- [ ] SOS button visible
- [ ] Navigation drawer works
- [ ] Volunteer 4-icon grid displays
- [ ] Admin 5-icon grid displays
- [ ] Settings page updates work
- [ ] Report incident form submits
- [ ] Social feed loads and displays
- [ ] Logout clears session

## Deployment Considerations

### Backend
1. Set proper JWT_SECRET in production
2. Configure CORS for mobile app domain
3. Use environment variables for all secrets
4. Set up database backups
5. Enable HTTPS/SSL
6. Configure rate limiting
7. Set up logging and monitoring

### Mobile
1. Update API base URL to production server
2. Configure proper app icons and splash screens
3. Set up push notifications (Firebase)
4. Request necessary permissions (Location, Camera)
5. Generate release signing keys
6. Build release APK/IPA
7. Test on multiple devices
8. Submit to Google Play Store / Apple App Store

### Database
1. Regular backups scheduled
2. Proper indexes on frequently queried columns
3. Connection pooling configured
4. Read replicas for scaling (if needed)

## Future Enhancements

1. **Real-time Features**
   - WebSocket integration for live alerts
   - Real-time chat in social feed
   - Live location tracking

2. **Weather Integration**
   - API integration with weather services
   - Forecast predictions
   - Severe weather notifications

3. **Advanced Features**
   - Offline mode with local database
   - Multi-language support (Tamil, Hindi)
   - Voice commands for emergency
   - SOS with automatic location sharing
   - Map integration for zones and clusters
   - Push notifications for alerts

4. **Analytics**
   - Incident statistics dashboard
   - Alert effectiveness tracking
   - User engagement metrics

5. **Emergency Features**
   - One-tap emergency contact
   - Automatic distress signal
   - Coast guard integration
   - Emergency broadcast system

## Maintenance

### Regular Tasks
- Monitor error logs
- Review and update alerts
- Clean up old data
- Update dependencies
- Security patches
- Performance optimization

### Database Maintenance
- Vacuum and analyze tables
- Archive old incidents and alerts
- Monitor database size
- Optimize slow queries

## Contact & Support

For technical issues:
1. Check application logs (backend and mobile)
2. Review database for data integrity
3. Verify network connectivity
4. Check authentication tokens
5. Confirm API endpoints are accessible

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready
