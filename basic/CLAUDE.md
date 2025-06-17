# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an event loop thrashing demonstration project using Fastify. It contains multiple server implementations to showcase different approaches to handling server load and protecting against event loop blocking:

- `server.js` - Basic Fastify server with no protection
- `server-protected.js` - Server with under-pressure middleware protection
- `server-load-aware.js` - Server that adapts behavior based on load conditions
- `route.js` - Shared route handler with simulated async/sync work

## Key Dependencies

- Fastify v5 as the web framework
- `@fastify/under-pressure` for load protection and monitoring
- `atomic-sleep` for simulating CPU-intensive synchronous work
- `autocannon` for load testing

## Load Testing Commands

The project uses autocannon for load testing with several predefined commands:

- `npm run hammer` - High load test: 100 connections, 10k requests, 1s timeout
- `npm run hammer2` - Sustained load test: 100 connections, 20s duration, 1s timeout  
- `npm run demo` - Demo load test: 50 connections, 10s duration, 1s timeout

## Server Behavior Patterns

Each server demonstrates different approaches to handling load:

1. **Basic server** (`server.js`) - No protection, degrades under load with high latency
2. **Protected server** (`server-protected.js`) - Returns 503 errors when under pressure
3. **Load-aware server** (`server-load-aware.js`) - Skips CPU-intensive work when under pressure

The route handler simulates real-world patterns:
- 10ms async delay (database query simulation)
- 20ms synchronous CPU work (processing simulation)

## Testing Different Server Implementations

To test different servers:
1. Start the desired server: `node server.js`, `node server-protected.js`, or `node server-load-aware.js`
2. Run load tests using the npm scripts or custom autocannon commands
3. Compare results in `results.md` which contains detailed performance analysis

## Performance Characteristics

- Basic server: ~39 req/s capacity, degrades badly under load
- Protected server: Maintains responsiveness but serves fewer successful requests
- Load-aware server: Can handle 1400+ req/s by adapting behavior under pressure