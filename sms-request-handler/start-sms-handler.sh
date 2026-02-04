#!/bin/bash

echo "🚀 Starting SMS Handler"
echo "======================="
echo ""

# Load all environment variables from .env file
set -a
source .env
set +a

echo "Database: PostgreSQL (textchain)"
echo "Port: 8080"
echo ""

cargo run --release
