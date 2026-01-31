# FestFeast Backend

Automation backend for FestFeast - scrapes and serves Delhi NCR college cultural fests, DU events, hackathons, and public events.

## 🚀 Features

- **Event Scraping**: Automated scraping from Unstop, Dare2Compete, Devfolio, MLH, Eventbrite, and more
- **Deduplication**: Smart hash-based duplicate detection (title + link)
- **Cron Automation**: Runs every 6 hours automatically
- **RESTful API**: Full CRUD endpoints for events
- **MongoDB Atlas**: Cloud database with Mongoose ODM
- **Production Ready**: Logging, error handling, health checks

## 📁 Project Structure

```
backend/
├── api/                    # Express route handlers
│   ├── events.js          # Event CRUD endpoints
│   ├── scrape.js          # Scraper trigger endpoints
│   ├── health.js          # Health check endpoints
│   └── index.js           # Route aggregator
├── models/                 # Mongoose schemas
│   └── Event.js           # Event model with dedup
├── scrapers/               # Playwright scrapers
│   ├── BaseScraper.js     # Abstract base class
│   ├── DUFestScraper.js   # DU/college fests
│   ├── EventSiteScraper.js # General event sites
│   ├── HackathonScraper.js # Tech hackathons
│   └── InstagramScraper.js # Instagram (limited)
├── services/               # Business logic
│   ├── scraperService.js  # Scraper orchestration
│   ├── eventService.js    # Event operations
│   └── cronService.js     # Scheduled jobs
├── utils/                  # Helpers
│   ├── logger.js          # Winston logging
│   └── helpers.js         # Utility functions
├── scripts/                # CLI scripts
│   └── runScraper.js      # Manual scraper runner
├── db.js                   # MongoDB connection
├── index.js                # Server entry point
├── package.json
├── .env.example
└── README.md
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (free tier works)
- Git

### Setup

1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/festfeast
   PORT=5000
   NODE_ENV=development
   API_KEY=your-secret-key
   FRONTEND_URL=http://localhost:5173
   ```

5. **Start the server**
   ```bash
   # Development (with auto-reload)
   npm run dev
   
   # Production
   npm start
   ```

## 📡 API Endpoints

### Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | Get all events (with filters) |
| GET | `/api/events/latest` | Get latest 20 events |
| GET | `/api/events/stats` | Get event statistics |
| GET | `/api/events/tags` | Get all unique tags |
| GET | `/api/events/sources` | Get all sources |
| GET | `/api/events/:id` | Get single event |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |

**Query Parameters for `/api/events`:**
- `category`: fest, hackathon, cultural, tech, music, workshop, other
- `mode`: Offline, Online, Hybrid
- `tag`: Filter by tag name
- `source`: Filter by source
- `search`: Full-text search
- `upcoming`: Show only upcoming events
- `limit`: Max results (default: 100)
- `skip`: Pagination offset

### Scraper

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scrape` | Trigger all scrapers |
| POST | `/api/scrape/:name` | Trigger specific scraper |
| GET | `/api/scrape/status` | Get scraper status |
| GET | `/api/scrape/list` | List available scrapers |

**Headers for protected endpoints:**
```
X-API-Key: your-api-key
```

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/health/db` | Database health check |

## 🔗 Connecting to Frontend

### Update Frontend API Service

In your React frontend, update the API service to use the backend:

```typescript
// services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ApiService = {
  async getEvents(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_BASE_URL}/events?${params}`);
    return response.json();
  },
  
  async getEventById(id: string) {
    const response = await fetch(`${API_BASE_URL}/events/${id}`);
    return response.json();
  },
  
  async getLatestEvents(limit = 20) {
    const response = await fetch(`${API_BASE_URL}/events/latest?limit=${limit}`);
    return response.json();
  }
};
```

### Add Environment Variable

Create `.env` in your frontend:
```env
VITE_API_URL=http://localhost:5000/api
```

For production:
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

## 🚀 Deploy to Render

### 1. Push to GitHub

```bash
git add .
git commit -m "Add backend"
git push origin main
```

### 2. Create Render Web Service

1. Go to [render.com](https://render.com) and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:

| Setting | Value |
|---------|-------|
| Name | festfeast-backend |
| Root Directory | backend |
| Environment | Node |
| Build Command | `npm install && npx playwright install chromium --with-deps` |
| Start Command | `npm start` |
| Instance Type | Free (or Starter for better performance) |

### 3. Add Environment Variables

In Render dashboard, add:

| Key | Value |
|-----|-------|
| MONGODB_URI | Your MongoDB Atlas connection string |
| NODE_ENV | production |
| API_KEY | Your secret API key |
| FRONTEND_URL | Your frontend URL |

### 4. Deploy

Click **Create Web Service**. Render will build and deploy automatically.

### 5. Update Frontend

Update your frontend's production environment:
```env
VITE_API_URL=https://festfeast-backend.onrender.com/api
```

## 📊 MongoDB Atlas Setup

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. Create database user
4. Add IP whitelist: `0.0.0.0/0` (allow all for Render)
5. Get connection string and add to `.env`

## 🔧 Manual Scraper Commands

```bash
# Run all scrapers
npm run scrape

# Run specific scraper
node scripts/runScraper.js DUFestScraper
node scripts/runScraper.js HackathonScraper
node scripts/runScraper.js EventSiteScraper
```

## 📝 Event Schema

```javascript
{
  _id: ObjectId,
  title: String,           // Required
  description: String,
  date: String,            // Flexible format
  startDate: Date,
  endDate: Date,
  location: String,
  venue: String,
  mode: 'Offline' | 'Online' | 'Hybrid',
  category: 'fest' | 'hackathon' | 'cultural' | 'tech' | 'music' | 'workshop' | 'other',
  tags: [String],
  source: String,          // Required
  sourceType: 'scraper' | 'manual' | 'api',
  link: String,
  ticketLink: String,
  organizer: String,
  entryFee: String,
  imageUrl: String,
  hash: String,            // Dedup hash (unique)
  status: 'draft' | 'published' | 'expired',
  confidence: Number,      // 0-1 for scraped content
  scrapedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Security Notes

- Always set `API_KEY` in production
- Use HTTPS in production
- MongoDB Atlas has built-in encryption
- Limit CORS origins in production

## 📈 Scaling Tips

1. **Database Indexes**: Already configured in Event model
2. **Rate Limiting**: Add `express-rate-limit` for production
3. **Caching**: Add Redis for frequently accessed data
4. **Queues**: Use Bull for scraper job queuing
5. **Multiple Dynos**: Render scales horizontally

## 🐛 Troubleshooting

### Playwright fails on Render
Make sure build command includes:
```
npx playwright install chromium --with-deps
```

### MongoDB connection timeout
- Check IP whitelist in Atlas
- Verify connection string
- Check network stability

### Scraper returns empty
- Some sites have anti-bot protection
- Check console logs for errors
- Try running specific scraper manually

## 📄 License

MIT
