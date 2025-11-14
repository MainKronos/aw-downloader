#!/bin/sh

# Exit on error
set -e

echo "Running database migrations..."
node ace migration:run --force

echo "Starting server..."
dumb-init -- node bin/server.js