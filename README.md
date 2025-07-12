# Leeky 2.0 - Professional OSINT Investigation Platform

A comprehensive, production-ready OSINT platform with **real GitHub search integration** for finding leaked secrets, credentials, and sensitive information in public repositories.

## 🚀 Quick Start

1. **Start the application:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000  
   - API Docs: http://localhost:8000/docs

## ✨ Features

### Core Platform
- ✅ **User Authentication** - Secure JWT-based auth with user profiles
- ✅ **Professional React UI** - Modern TypeScript interface with Tailwind CSS
- ✅ **Real-time Updates** - Auto-refresh and live status monitoring
- ✅ **PostgreSQL Database** - Full persistence with relationship modeling
- ✅ **Docker Deployment** - Production-ready containerization
- ✅ **REST API** - FastAPI with OpenAPI documentation

### User Experience
- ✅ **Profile Management** - GitHub token configuration and credential storage
- ✅ **Investigation Management** - Start, monitor, and cancel scans
- ✅ **Clickable Navigation** - Intuitive UI with breadcrumbs and routing
- ✅ **Duration Tracking** - Real-time investigation timers
- ✅ **Categorized Results** - Findings grouped by classification type
- ✅ **Detailed Views** - Expandable modals with full finding context

### OSINT Capabilities  
- ✅ **Real GitHub Code Search** - Live GitHub API integration
- ✅ **Advanced Dork Templates** - 10+ optimized search patterns
- ✅ **Pattern Recognition** - Intelligent secret detection algorithms
- ✅ **Risk Assessment** - Contextual scoring based on finding type
- ✅ **Direct GitHub Links** - One-click access to source repositories
- ✅ **No Fake Data** - 100% real results from actual GitHub searches

## 🔧 GitHub Integration Setup

### Method 1: User Profile Configuration (Recommended)
1. **Create GitHub Personal Access Token:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `public_repo`
   - Copy the token (starts with `ghp_`)

2. **Configure in Application:**
   - Click your username in the top-right corner
   - Navigate to Profile page
   - Enter your GitHub token in the "GitHub Integration" section
   - Save credentials

### Method 2: Environment Variable (System-wide)
```bash
# Create .env file in project root
GITHUB_TOKEN=ghp_your_github_token_here

# Restart application
docker-compose restart
```

## 🎯 How It Works

### Investigation Workflow
1. **Start Investigation** - Enter domain name and click "Start Investigation"
2. **Monitor Progress** - Watch real-time status updates with duration timer
3. **Review Results** - Findings automatically grouped by classification
4. **Explore Details** - Click findings for detailed views with GitHub links
5. **Manage Scans** - Cancel running investigations or navigate between results

### With GitHub Token  
- **Real GitHub code search** using optimized dork templates
- **Live secret detection** in public repositories  
- **Actual security findings** with direct GitHub links
- **Intelligent rate limiting** to respect GitHub API limits
- **Contextual risk scoring** based on file type and content

### Without GitHub Token
- **Scan fails gracefully** with clear error messaging
- **No fake data** - only real results are displayed
- **Encourages proper setup** via profile configuration

## 🕵️ Scan Types & Detection

**Search Patterns:**
- `filename:.env "domain.com"` - Environment files
- `"domain.com" password` - Password references  
- `"domain.com" api_key` - API keys and tokens
- `"domain.com" secret` - Secret keys and tokens
- `filename:config.json "domain.com"` - Configuration files
- And 5+ more targeted patterns...

**Detected Secrets:**
- 🔑 **API Keys** (OpenAI, Stripe, AWS, etc.)
- 🔐 **Database Credentials** (passwords, connection strings)
- ☁️ **Cloud Credentials** (AWS, Azure, GCP)
- 🔢 **JWT Secrets** and authentication tokens
- 📧 **Email/Password** combinations

## 📊 Risk Scoring & Classification

### Risk Levels
- **9.0-10.0**: **Critical** - Production API keys, GitHub tokens, AWS credentials
- **7.0-8.9**: **High** - Database passwords, JWT secrets, cloud credentials  
- **5.0-6.9**: **Medium** - Configuration files, non-production credentials
- **3.0-4.9**: **Low** - Domain references, comments, documentation
- **0.0-2.9**: **Info** - General mentions, non-sensitive references

### Classification Categories
- 🔑 **API Keys & Secrets** - OpenAI, Stripe, third-party service keys
- 🔐 **Credentials & Passwords** - Database passwords, user credentials
- ☁️ **Cloud Credentials** - AWS, Azure, GCP access keys
- 🏦 **Database Credentials** - Connection strings, database passwords
- 🔒 **Version Control Tokens** - GitHub, GitLab, Bitbucket tokens
- 🛡️ **Authentication Secrets** - JWT secrets, session keys
- 📁 **Configuration Files** - Environment files, config data
- 📧 **Domain References** - Email addresses, general domain mentions

### Risk Factors
- **+1.0** for production keywords (prod, live, main)
- **-2.0** for test/dev keywords (test, dev, example, demo)
- **+0.5** for sensitive file extensions (.env, .config, .yml)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TypeScript)            │
│  • Modern UI with Tailwind CSS                             │
│  • Real-time updates and status monitoring                 │
│  • Profile management and credential storage               │
│  • Categorized results with detailed views                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API calls (axios)
┌─────────────────────▼───────────────────────────────────────┐
│                 Backend (FastAPI + Python)                 │
│  • JWT authentication and user management                  │
│  • GitHub API integration with rate limiting               │
│  • Pattern recognition and risk scoring                    │
│  • Scan management and status tracking                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ GitHub API calls
┌─────────────────────▼───────────────────────────────────────┐
│                  GitHub Code Search API                    │
│  • Real-time code search across public repos               │
│  • 10+ optimized dork templates                           │
│  • File content analysis and extraction                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ Results persistence
┌─────────────────────▼───────────────────────────────────────┐
│               PostgreSQL Database                          │
│  • Users, scans, results, and credentials                  │
│  • Relationship modeling and data integrity                │
│  • Investigation history and audit trails                  │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing & Usage

### Via Web Interface (Recommended)
1. **Register/Login** at http://localhost:3000
2. **Configure GitHub Token** in your profile
3. **Start Investigation** with any domain name
4. **Monitor Progress** with real-time updates
5. **Explore Results** with categorized findings

### Via API
```bash
# Authentication
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_username&password=your_password"

# Start investigation
curl -X POST "http://localhost:8000/api/scans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your_jwt_token]" \
  -d '{"domain": "example.com"}'

# Cancel investigation
curl -X POST "http://localhost:8000/api/scans/[scan_id]/cancel" \
  -H "Authorization: Bearer [your_jwt_token]"
```

## 💻 Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend  
```bash
cd frontend
npm install
npm run dev
```

### Database
```bash
# Connect to database
docker-compose exec db psql -U leeky_user -d leeky

# View tables
\dt
```

## 🔐 Security Features

- **Rate Limiting**: Automatic delays between GitHub API calls
- **Error Handling**: Graceful fallback to simulation on API failures  
- **Token Security**: Environment-based credential management
- **Input Validation**: Sanitized domain inputs and SQL injection protection
- **CORS Protection**: Configured for frontend-only access

## 📈 Sample Results

### Investigation Output
Each finding includes:
- **🏷️ Classification** - Categorized by security type
- **📁 Repository & File Path** - Exact location of finding  
- **🔍 Code Snippet** - Actual leaked content
- **⚠️ Risk Score** - Contextual scoring (0.0-10.0)
- **🔗 GitHub Link** - Direct access to source file
- **📄 Raw Content** - Additional context for verification

### Result Categories
Findings are automatically grouped by:
- **API Keys & Secrets** (9.0+ risk) - Production service keys
- **Database Credentials** (8.5+ risk) - Connection strings, passwords
- **Cloud Credentials** (9.5+ risk) - AWS, Azure, GCP keys
- **Authentication Secrets** (8.8+ risk) - JWT secrets, session keys
- **Version Control Tokens** (9.8+ risk) - GitHub, GitLab tokens
- **Configuration Files** (Variable) - Environment and config data
- **Domain References** (3.0 risk) - General domain mentions

## 🛡️ Security & Production Considerations

### Current Security Features
- **JWT Authentication** - Secure token-based auth
- **Per-user Credentials** - Encrypted GitHub token storage
- **Rate Limiting** - Intelligent GitHub API throttling
- **Input Validation** - Sanitized inputs and SQL injection protection
- **CORS Protection** - Configured for frontend-only access
- **Error Handling** - Graceful failures without data exposure

### Production Recommendations
- **Async Processing** - Implement Celery/Redis for scan execution
- **Enhanced Encryption** - Use Fernet or similar for credential storage
- **Audit Logging** - Track all user actions and scan results
- **Role-based Access** - Admin users and organization management
- **API Rate Limits** - Request limiting per user/organization
- **Result Retention** - Configurable data retention policies

## 🔮 Future Enhancements

### Planned Integrations
- **Shodan API** - Infrastructure and service discovery
- **SecurityTrails** - DNS intelligence and subdomain enumeration
- **VirusTotal** - Malware analysis and threat intelligence  
- **Have I Been Pwned** - Breach data correlation
- **WhoisXML** - Domain registration and ownership data

### Advanced Features
- **Custom Dork Templates** - User-defined search patterns
- **Investigation Reports** - PDF/HTML export functionality
- **Team Collaboration** - Shared investigations and findings
- **Notification System** - Email/Slack alerts for high-risk findings
- **API Webhooks** - Real-time integration with external tools
- **Dark Web Monitoring** - Extended OSINT beyond GitHub

## 🎮 Ready to Investigate!

Leeky 2.0 is now a professional-grade OSINT platform ready for real security investigations. The combination of real GitHub integration, intelligent pattern recognition, and professional UX makes it ideal for:

- **Security Researchers** - Finding exposed secrets and credentials
- **Bug Bounty Hunters** - Discovering attack vectors and sensitive data
- **Penetration Testers** - Reconnaissance and information gathering
- **DevSecOps Teams** - Continuous security monitoring
- **Compliance Teams** - Data exposure auditing

**Start investigating and stay secure! 🔍🛡️**