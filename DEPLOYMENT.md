# Water Quality Monitor Deployment Guide

This guide explains how to deploy the Water Quality Monitor application using Render (backend) and Vercel (frontend).

## Project Structure

- `backend/`: Express.js backend with SQLite database
- `frontend/`: React/Vite frontend application
- `WATER_QT_ESP/`: ESP32 device code

## Deployment Architecture

We're using a split deployment approach:

1. **Backend**: Hosted on Render with persistent storage for the SQLite database
2. **Frontend**: Hosted on Vercel for optimal global CDN distribution

This approach gives us the best combination of reliable backend hosting and high-performance frontend delivery.

## Backend Deployment (Render)

1. **Create a Render account** at https://render.com if you don't already have one

2. **Connect your GitHub repository** to Render or use the Render CLI

3. **Create a new Web Service**:
   - Select your repository
   - Render will automatically detect your `render.yaml` configuration
   - Or, create a web service manually with these settings:
     - **Name**: water-quality-backend
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Root Directory**: `/backend`
     
4. **Configure environment variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will automatically assign a port but we set it for clarity)
   - `DB_PATH`: `/data/database.sqlite` (using persistent disk)

5. **Set up disk storage**:
   - Add a disk with at least 1GB storage
   - Mount path: `/data`
   - This ensures your SQLite database persists between deployments

6. **Initialize the database**:
   - After deploying, connect to your service shell:
   - Run `npm run db:init` to set up the database with sample data

## Frontend Deployment (Vercel)

1. **Create a Vercel account** at https://vercel.com if you don't already have one

2. **Connect your GitHub repository** to Vercel

3. **Import your project**:
   - Select the repository
   - Vercel will automatically detect it's a Vite project

4. **Configure project settings**:
   - **Project Name**: water-quality-frontend
   - **Framework Preset**: Vite
   - **Root Directory**: `/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. **Set environment variables**:
   - None required as configuration is handled in the code

6. **Deploy**:
   - Vercel will automatically build and deploy your frontend

## Testing the Deployment

1. Open your Vercel frontend deployment URL
2. The frontend should connect to your Render backend through the configured rewrites
3. Verify that data is loading properly and charts are displaying correctly

## ESP32 Integration

If you need the ESP32 device to connect to your deployed backend:

1. Update the ESP32 code to point to your Render backend URL
2. The ESP32 will need internet access to push data to the cloud backend

## Troubleshooting

- **CORS issues**: Check the backend CORS configuration if the frontend cannot connect
- **Database errors**: Verify the database was initialized correctly on Render
- **Connection timeouts**: Render may sleep on free tier; upgrading to a paid plan prevents this

## Maintenance

- **Backend updates**: Push to your repository; Render will automatically rebuild
- **Frontend updates**: Push to your repository; Vercel will automatically rebuild
- **Database backups**: Periodically download your database from Render for backup

---

*This deployment configuration optimizes for modern web application best practices, using specialized services for both frontend and backend components.*