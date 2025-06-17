# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an event loop thrashing demonstration project using Fastify. It contains multiple server implementations to showcase different approaches to handling server load and protecting against event loop blocking:

- `server.js` - Basic Fastify server with no protection
- `server-protected.js` - Server with under-pressure middleware protection
- `server-load-aware.js` - Server that adapts behavior based on load conditions
- `server-threaded.js` - Server using Piscina thread pool for CPU-intensive work
- `route.js` - Shared route handler with simulated async/sync work
- `cpu-worker.js` - Worker script for thread pool processing

## Key Dependencies

- Fastify v5 as the web framework
- `@fastify/under-pressure` for load protection and monitoring
- `atomic-sleep` for simulating CPU-intensive synchronous work
- `piscina` for thread pool management and worker threads
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
4. **Threaded server** (`server-threaded.js`) - Uses Piscina thread pool to offload CPU work, with queue-based protection

The route handler simulates real-world patterns:
- 10ms async delay (database query simulation)
- 20ms synchronous CPU work (processing simulation)

## Testing Different Server Implementations

To test different servers:
1. Start the desired server: `node server.js`, `node server-protected.js`, `node server-load-aware.js`, or `node server-threaded.js`
2. Run load tests using the npm scripts or custom autocannon commands
3. Compare results in `results.md` which contains detailed performance analysis

## Performance Characteristics

- Basic server: ~39 req/s capacity, degrades badly under load
- Protected server: Maintains responsiveness but serves fewer successful requests
- Load-aware server: Can handle 1400+ req/s by adapting behavior under pressure
- Threaded server: Offloads CPU work to worker threads, prevents event loop blocking

## Thread Pool Implementation

The threaded server (`server-threaded.js`) uses Piscina with:
- `maxQueue: 'auto'` for automatic queue sizing
- Queue size checking (`pool.queueSize < pool.options.maxQueue`) before queuing work
- CPU-intensive work executed in separate worker threads via `cpu-worker.js`
- Graceful fallback when queue is full to maintain responsiveness