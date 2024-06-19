#!/bin/bash

# Install dependencies
npm install

# Start the Next.js app
npm run dev &

# Start the HTTP server for the dummy HTML page
http-server -p 8080 &

# Wait for both processes to complete
wait