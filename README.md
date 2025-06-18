# Event Loop Thrashing

A comprehensive demonstration project showcasing Node.js event loop behavior under different server load conditions. This repository contains multiple implementations demonstrating various strategies for handling event loop blocking and server overload scenarios.

## Overview

This project demonstrates the critical importance of event loop management in Node.js applications by implementing multiple server variants that handle load differently. It includes both basic Fastify implementations and advanced Platformatic Runtime examples, each showcasing different patterns for managing event loop thrashing.

## Project Structure

The repository is organized into two main sections:

### `/basic` - Fastify Server Implementations
- **`server.js`** - Basic Fastify server with no protection mechanisms
- **`server-protected.js`** - Server with `@fastify/under-pressure` middleware for load protection
- **`server-load-aware.js`** - Adaptive server that modifies behavior based on load conditions
- **`server-threaded.js`** - Thread pool implementation using Piscina for CPU-intensive work
- **`server-threaded-protected.js`** - Combined threading and pressure protection
- **`route.js`** - Shared route handler simulating realistic async/sync workloads
- **`cpu-worker.js`** - Worker script for thread pool processing
- **`results.md`** - Detailed performance analysis and benchmarking results

### `/watt` - Platformatic Runtime Implementation
- **`web/composer/`** - API gateway and service orchestration layer
- **`web/service/`** - Backend Fastify service with event loop simulation
- **`web/ssr/`** - Next.js server-side rendering application
- **`watt.json`** - Runtime configuration for service mesh

## Key Dependencies

### Basic Implementation
- **Fastify v5** - High-performance web framework
- **`@fastify/under-pressure`** - Load protection and health monitoring
- **`atomic-sleep`** - Synchronous CPU work simulation
- **`piscina`** - Thread pool management for worker threads
- **`autocannon`** - HTTP benchmarking and load testing

### Watt Implementation  
- **Platformatic Runtime** - Microservices orchestration platform
- **Next.js** - React-based SSR framework
- **`wattpm`** - Platformatic package manager

## Getting Started

### Basic Servers

1. **Install dependencies:**
   ```bash
   cd basic
   npm install
   ```

2. **Start a server:**
   ```bash
   # Basic server (no protection)
   node server.js
   
   # Protected server (with under-pressure)
   node server-protected.js
   
   # Load-aware server (adaptive behavior)
   node server-load-aware.js
   
   # Threaded server (worker pool)
   node server-threaded.js
   ```

3. **Run load tests:**
   ```bash
   # High intensity: 100 connections, 10k requests
   npm run hammer
   
   # Sustained load: 100 connections, 20 seconds
   npm run hammer2
   
   # Demo load: 50 connections, 10 seconds
   npm run demo
   ```

### Watt Platform

1. **Install dependencies:**
   ```bash
   cd watt
   npm install
   ```

2. **Development mode:**
   ```bash
   npm run dev
   ```

3. **Production build:**
   ```bash
   npm run build
   npm start
   ```

4. **Load testing:**
   ```bash
   # Test main service
   npm run demo
   
   # Test SSR service
   npm run demo-ssr
   ```

## Server Implementations & Behavior

### 1. Basic Server (`server.js`)
- **Capacity:** ~39 req/s
- **Behavior:** No protection mechanisms, degrades catastrophically under load
- **Latency:** Can exceed 1000ms under stress, frequent timeouts
- **Use Case:** Demonstrates baseline event loop blocking issues

### 2. Protected Server (`server-protected.js`) 
- **Protection:** Returns HTTP 503 when under pressure
- **Behavior:** Maintains responsiveness but serves fewer successful requests
- **Advantage:** Prevents complete service degradation
- **Trade-off:** Higher error rates but stable performance for successful requests

### 3. Load-Aware Server (`server-load-aware.js`)
- **Capacity:** 1400+ req/s under load
- **Strategy:** Skips CPU-intensive work when pressure detected
- **Performance:** Massive throughput improvement by adaptive behavior
- **Implementation:** Uses under-pressure middleware to detect load conditions

### 4. Threaded Server (`server-threaded.js`)
- **Architecture:** Offloads CPU work to Piscina worker threads
- **Queue Management:** Automatic queue sizing with overflow protection
- **Benefits:** Prevents event loop blocking while maintaining full functionality
- **Fallback:** Graceful degradation when thread pool queue is full

### 5. Threaded + Protected Server (`server-threaded-protected.js`)
- **Hybrid Approach:** Combines threading with pressure-based protection
- **Robustness:** Multiple layers of protection against overload
- **Production Ready:** Most comprehensive solution for high-load scenarios

## Load Testing & Performance Analysis

### Simulation Characteristics
Each route handler simulates realistic application patterns:
- **10ms async delay** - Database query simulation using `setTimeout`
- **20ms synchronous work** - CPU processing simulation using `atomic-sleep`

### Benchmarking Commands
```bash
# Aggressive load testing
autocannon -c 100 -a 10000 -t 1 --renderStatusCodes http://127.0.0.1:3000

# Sustained pressure testing  
autocannon -c 100 -d 20 -t 1 --renderStatusCodes http://127.0.0.1:3000

# Controlled load testing
autocannon -c 50 -d 10 -t 1 --renderStatusCodes http://127.0.0.1:3000
```

### Key Performance Insights

1. **Event Loop Saturation Point:** ~41 req/s for basic server
2. **Catastrophic Failure Pattern:** Latency exceeds 1000ms, causing cascade failures
3. **Protection Effectiveness:** under-pressure middleware prevents total service degradation
4. **Adaptive Benefits:** Load-aware servers can handle 35x more requests
5. **Threading Advantages:** CPU work isolation prevents event loop blocking

## Event Loop Thrashing Patterns

### What is Event Loop Thrashing?
Event loop thrashing occurs when synchronous operations block the Node.js event loop, preventing it from processing new requests efficiently. This leads to:

- **Latency Accumulation:** Requests queue up, causing exponential latency growth
- **Memory Pressure:** Unprocessed requests consume increasing memory
- **Cascade Failures:** Timeouts trigger retries, amplifying the problem
- **Service Degradation:** Eventually leads to complete service unresponsiveness

### Mitigation Strategies Demonstrated

1. **Pressure Detection:** Monitor event loop utilization and memory usage
2. **Circuit Breaking:** Reject requests when system is overloaded  
3. **Adaptive Behavior:** Reduce work complexity under pressure
4. **Work Offloading:** Move CPU-intensive tasks to worker threads
5. **Queue Management:** Limit concurrent operations to prevent overwhelming

## Architecture Patterns

### Microservices (Watt Platform)
The Platformatic Runtime implementation demonstrates:
- **Service Mesh:** Inter-service communication and discovery
- **Gateway Pattern:** Centralized routing and load balancing
- **Horizontal Scaling:** Multiple service instances for load distribution
- **Health Monitoring:** Built-in service health checks and metrics

### Thread Pool Management
The Piscina implementation showcases:
- **Worker Isolation:** CPU tasks run in separate threads
- **Queue Control:** Automatic queue sizing with overflow handling
- **Graceful Degradation:** Fallback behavior when thread pool is saturated
- **Resource Management:** Efficient thread lifecycle management

## Monitoring & Observability

### Under-Pressure Metrics
- **Event Loop Utilization:** Real-time event loop blocking detection
- **Memory Usage:** Heap and RSS memory monitoring  
- **Response Time:** P95/P99 latency tracking
- **Health Status:** Overall service health indicators

### Load Testing Metrics
- **Throughput:** Requests per second capacity
- **Latency Distribution:** P50, P95, P99 response times
- **Error Rates:** Success vs failure ratios
- **Timeout Analysis:** Request timeout patterns and causes

## Production Considerations

### Deployment Strategies
1. **Load Balancing:** Distribute traffic across multiple instances
2. **Auto-scaling:** Scale based on event loop utilization metrics
3. **Circuit Breakers:** Implement upstream circuit breaking
4. **Rate Limiting:** Control incoming request rates

### Monitoring Setup
1. **APM Integration:** Application performance monitoring
2. **Custom Metrics:** Event loop utilization dashboards
3. **Alerting:** Proactive notifications for performance degradation
4. **Log Analysis:** Request pattern analysis and optimization

## Contributing

This project serves as an educational resource for understanding Node.js performance characteristics. Contributions are welcome for:

- Additional server implementation patterns
- Enhanced monitoring and metrics collection
- Performance optimization techniques
- Real-world scenario simulations

## License

Apache-2.0 License - See [LICENSE](LICENSE) file for details.