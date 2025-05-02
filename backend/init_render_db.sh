#!/bin/bash

# Script to initialize the database on Render Free Tier
echo "=== Water Quality Database Setup ==="

# Ensure database directory exists
mkdir -p /data

# Check if database already exists
if [ -f "/data/database.sqlite" ]; then
  echo "Database already exists, checking its status..."
  
  # Use a lightweight check to see if tables exist
  TABLES=$(sqlite3 /data/database.sqlite "SELECT name FROM sqlite_master WHERE type='table';")
  
  if [[ $TABLES == *"water_quality_data"* ]]; then
    echo "Database tables exist. Checking record counts..."
    
    # Check if there's any data
    COUNT=$(sqlite3 /data/database.sqlite "SELECT COUNT(*) FROM water_quality_data;")
    
    if [ "$COUNT" -gt "0" ]; then
      echo "Database already contains $COUNT records. Skipping initialization."
      echo "If you want to reinitialize, delete the database file first."
      exit 0
    else
      echo "Tables exist but no data found. Will populate with sample data."
    fi
  else
    echo "Database file exists but no tables found. Will initialize."
  fi
else
  echo "Database file not found. Will create and initialize."
fi

echo "Initializing database with minimal sample data (optimized for free tier)..."
export DB_PATH=/data/database.sqlite

# Run database initialization with reduced sample data
NODE_OPTIONS="--max_old_space_size=512" node src/utils/initDatabase.js

echo "Database initialization complete!"
echo "You can now access your water quality monitoring application."