#!/bin/bash
# Production build script for the frontend
# This script prepares the frontend for deployment to Vercel

echo "======================================"
echo "Water Quality Monitor Frontend Build"
echo "======================================"

# Install dependencies
echo "Installing dependencies..."
npm install

# Run linting (optional)
echo "Running linter checks..."
npm run lint

# Build for production
echo "Building for production..."
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
  echo "======================================"
  echo "Frontend build successful!"
  echo "Files ready for deployment in ./dist"
  echo "======================================"
else
  echo "======================================"
  echo "Frontend build failed!"
  echo "Check errors above and try again."
  echo "======================================"
  exit 1
fi