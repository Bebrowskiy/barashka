# 🚀 Deployment Guide

Complete guide for deploying Barashka Music Player to various platforms.

---

## 📋 Table of Contents

1. [Web Deployment](#web-deployment)
2. [Desktop Applications](#desktop-applications)
3. [Cloud Platforms](#cloud-platforms)
4. [Docker](#docker)
5. [Self-Hosting](#self-hosting)
6. [Production Checklist](#production-checklist)

---

## 🌐 Web Deployment

### GitHub Pages

**Best for**: Personal projects, free hosting

#### Steps:

1. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: `Deploy from branch`
   - Branch: `main`
   - Folder: `/dist`

2. **Build and Deploy**
   ```bash
   # Install dependencies
   npm install

   # Build for production
   npm run build:web

   # Deploy using gh-pages
   npm run deploy
   ```

3. **Access**
   - URL: `https://username.github.io/repo-name/`

#### Automated Deployment

The CI/CD pipeline automatically deploys on push to `main` branch.

---

### Vercel

**Best for**: Fast global CDN, automatic deployments

#### Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # Build first
   npm run build:web

   # Deploy
   vercel --prod
   ```

4. **Configuration**
   - Create `vercel.json`:
   ```json
   {
     "buildCommand": "npm run build:web",
     "outputDirectory": "dist",
     "devCommand": "npm run dev",
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ]
   }
   ```

---

### Netlify

**Best for**: Easy setup, form handling

#### Steps:

1. **Connect Repository**
   - Go to [Netlify](https://netlify.com)
   - Import your GitHub repository

2. **Build Settings**
   - Build command: `npm run build:web`
   - Publish directory: `dist`

3. **Environment Variables**
   - Add variables from `.env.example`

4. **Deploy**
   - Click "Deploy site"

---

## 💻 Desktop Applications

### Tauri (Windows, macOS, Linux)

#### Prerequisites

- Node.js >= 18
- Tauri CLI (`@tauri-apps/cli`)
- Rust toolchain (auto-installed by Tauri)
- **Windows only**: Visual Studio C++ Build Tools with "Desktop development with C++" workload

#### Build Steps:

```bash
# Install dependencies
npm install

# Build desktop app
npm run tauri build

# Output locations:
# Windows: src-tauri/target/release/bundle/nsis/Barashka_*.exe
# macOS: src-tauri/target/release/bundle/dmg/Barashka_*.dmg
# Linux: src-tauri/target/release/bundle/deb/Barashka_*.deb and .AppImage
```

#### Before Building:

1. **Update `src-tauri/tauri.conf.json`**:
   - `productName`: "Barashka"
   - `version`: Your version (e.g., "1.0.0")
   - `identifier`: Unique identifier (e.g., "ru.barashka.desktop")

2. **Update icons** in `src-tauri/icons/` with your app icon

3. **Configure Discord RPC** (optional):
   - Edit `src-tauri/src/lib.rs` with your Discord Application ID
   - See [TAURI_GUIDE.md](TAURI_GUIDE.md) for details

#### Distribution:

- **Windows**: Distribute `.exe` installer from `nsis/` folder
- **macOS**: Distribute `.dmg` (requires notarization for Catalina+)
- **Linux**: Distribute `.deb` package or `.AppImage`

---

### macOS Notarization (Required for Catalina+)

1. **Get Apple Developer Certificate** from Apple Developer Portal

2. **Sign the app**:
   ```bash
   codesign --deep --force --verify --verbose \
     --sign "Developer ID Application: Your Name" \
     src-tauri/target/release/bundle/macos/Barashka.app
   ```

3. **Notarize**:
   ```bash
   xcrun notarytool submit src-tauri/target/release/bundle/dmg/Barashka_*.dmg \
     --apple-id "your@email.com" \
     --password "app-specific-password" \
     --team-id "TEAM_ID"
   ```

---

## ☁️ Cloud Platforms

### Railway

1. **Connect Repository**
2. **Add Build Command**: `npm run build:web`
3. **Add Start Command**: `npx serve dist`
4. **Add Environment Variables**

### Render

1. **New Web Service**
2. **Connect Repository**
3. **Build Command**: `npm run build:web`
4. **Start Command**: `npx serve dist -p $PORT`
5. **Set PORT environment variable**

### Heroku

1. **Create Procfile**:
   ```
   web: npx serve dist -p $PORT
   ```

2. **Deploy**:
   ```bash
   heroku create barashka-music
   git push heroku main
   ```

---

## 🐳 Docker

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build:web

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

### Docker Compose

```yaml
version: '3.8'

services:
  barashka:
    build: .
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  # Optional: PocketBase for database
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb_data
    restart: unless-stopped
```

### Build and Run

```bash
# Build image
docker build -t barashka-music .

# Run container
docker run -d -p 3000:80 --name barashka barashka-music

# Or with Docker Compose
docker compose up -d
```

---

## 🏠 Self-Hosting

### Requirements

- Web server (Nginx, Apache, Caddy)
- Node.js 18+ (for build process)
- SSL certificate (recommended)

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name barashka.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name barashka.yourdomain.com;

    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Root directory
    root /var/www/barashka/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
}
```

### Deployment Script

```bash
#!/bin/bash

# deploy.sh

set -e

echo "🚀 Deploying Barashka Music Player..."

# Build
npm run build:web

# Copy to web directory
sudo cp -r dist/* /var/www/barashka/

# Set permissions
sudo chown -R www-data:www-data /var/www/barashka
sudo chmod -R 755 /var/www/barashka

# Reload Nginx
sudo systemctl reload nginx

echo "✅ Deployment complete!"
```

---

## ✅ Production Checklist

Before deploying to production:

### Security

- [ ] Set `AUTH_ENABLED=true` if authentication required
- [ ] Generate strong `AUTH_SECRET` (minimum 32 characters)
- [ ] Configure Firebase credentials
- [ ] Enable HTTPS/SSL
- [ ] Set up CORS properly
- [ ] Review security headers
- [ ] Remove console.log statements
- [ ] Run `npm audit` and fix vulnerabilities

### Performance

- [ ] Enable gzip/brotli compression
- [ ] Configure caching headers
- [ ] Minimize bundle size
- [ ] Enable CDN for static assets
- [ ] Optimize images
- [ ] Lazy load non-critical resources

### Monitoring

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure logging
- [ ] Set up uptime monitoring
- [ ] Configure alerts for downtime
- [ ] Set up analytics

### Backup

- [ ] Backup database (PocketBase/Firebase)
- [ ] Backup user data
- [ ] Set up automated backups
- [ ] Test restore procedure

### Documentation

- [ ] Update README with deployment instructions
- [ ] Document environment variables
- [ ] Create runbook for common issues
- [ ] Document rollback procedure

---

## 🔧 Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build:web

# Check Node version
node --version  # Should be >= 18
```

### Desktop App Won't Start

```bash
# Check Tauri installation
npm run tauri -- --version

# Rebuild desktop app
npm run tauri build

# Check logs:
# Windows: Event Viewer
# macOS: Console.app
# Linux: journalctl
```

### API Connection Issues

- Check API instance status
- Verify CORS settings
- Check firewall rules
- Review API credentials

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Bebrowskiy/barashka/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Bebrowskiy/barashka/discussions)

---

**Last Updated**: March 2026
