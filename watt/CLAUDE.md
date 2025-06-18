# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a Platformatic Runtime application designed to demonstrate event loop thrashing patterns. The application uses a microservices architecture with multiple services coordinated through a composer:

- **Composer Service** (`web/composer/`): Acts as the main entry point and API gateway using Platformatic Composer
- **Service** (`web/service/`): A Fastify-based backend service that simulates database queries and synchronous work
- **SSR Service** (`web/ssr/`): A Next.js application for server-side rendering

The runtime configuration (`watt.json`) defines the composer as the entrypoint and manages service discovery and routing.

## Key Development Commands

### Main Application
- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build all services for production  
- `npm start` - Start the production server
- `npm run demo` - Run load testing against the main service using autocannon
- `npm run demo-ssr` - Run load testing against the SSR service

### Individual Services
- `cd web/composer && npm test` - Run tests for the composer service
- `cd web/ssr && npm run lint` - Lint the Next.js application

## Service Architecture

The application demonstrates event loop behavior through:
1. **Async operations**: Database query simulation using `setTimeout`
2. **Synchronous blocking**: CPU-intensive work using `atomic-sleep`
3. **Load testing**: Configured autocannon tests to stress the event loop

Services communicate through the Platformatic Runtime's service mesh, with the composer handling routing:
- Root `/` routes to the main service
- `/ssr` routes to the Next.js application

## Testing Performance

The project includes pre-configured load testing commands that simulate concurrent requests to identify event loop thrashing patterns. Use `npm run demo` to test the main service performance under load.