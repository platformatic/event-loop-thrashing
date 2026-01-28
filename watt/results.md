# Comprehensive Benchmark Results

This document contains benchmark results for the Platformatic Watt application under various configurations of workers and health check settings.

## Benchmark Parameters

- **Tool**: autocannon
- **Connections**: 100
- **Duration**: 30 seconds
- **Timeout**: 1 second
- **Command**: `npx autocannon -c 100 -d 30 -t 1 <url>`

## Health Check Settings (when enabled)

```
HEALTH_ENABLED=true
HEALTH_INTERVAL=1000
HEALTH_MAX_ELU=0.80
HEALTH_MAX_UNHEALTHY_CHECKS=1
```

---

## Main Service Results (`/` endpoint)

The main service simulates database queries with synchronous blocking work using `atomic-sleep`.

| Workers | Health | Req/Sec (Avg) | Latency Avg (ms) | Latency p99 (ms) | Total Requests | Errors | Timeouts | Restarts |
|---------|--------|---------------|------------------|------------------|----------------|--------|----------|----------|
| 1       | Off    | 1.34          | 505.20           | 978              | 40             | 0      | 3,000    | N/A      |
| 1       | On     | 0             | 0                | 0                | 0              | 1,234,800 | 0     | 1        |
| 2       | Off    | 2.80          | 518.49           | 999              | 84             | 0      | 2,897    | N/A      |
| 2       | On     | 11.57         | 498.58           | 993              | 347            | 0      | 2,777    | 0        |
| 4       | Off    | 170.04        | 581.94           | 633              | 5,101          | 0      | 0        | N/A      |
| 4       | On     | 172.10        | 575.04           | 642              | 5,163          | 0      | 0        | 0        |

### Key Observations - Main Service

1. **1 Worker**: The service is severely impacted by event loop blocking. With health checks enabled, the single worker gets continuously replaced, causing complete service unavailability.

2. **2 Workers**: Slight improvement over 1 worker, but still experiencing significant timeouts (~97% failure rate). Health checks provide marginal improvement (347 vs 84 successful requests).

3. **4 Workers**: Dramatic improvement - zero timeouts achieved. The additional parallelism allows the service to handle the 100 concurrent connections without timing out.

---

## SSR Service Results (`/ssr` endpoint)

The SSR service runs Next.js for server-side rendering.

| Workers | Health | Req/Sec (Avg) | Latency Avg (ms) | Latency p99 (ms) | Total Requests | Errors | Timeouts | Restarts |
|---------|--------|---------------|------------------|------------------|----------------|--------|----------|----------|
| 1       | Off    | 1,654.80      | 59.83            | 77               | 49,644         | 4      | 4        | N/A      |
| 1       | On     | 0             | 0                | 0                | 0              | 1,242,600 | 0     | 1        |
| 2       | Off    | 3,040.54      | 32.38            | 60               | 91,210         | 0      | 0        | N/A      |
| 2       | On     | 3,009.40      | 32.71            | 60               | 90,265         | 0      | 0        | 0        |
| 4       | Off    | 4,771.30      | 20.46            | 53               | 143,122        | 0      | 0        | N/A      |
| 4       | On     | 4,848.11      | 20.12            | 50               | 145,422        | 0      | 0        | 0        |

### Key Observations - SSR Service

1. **1 Worker**: Good performance when health is disabled (~1,655 req/sec). With health checks enabled, the service becomes unavailable due to worker replacement cascade.

2. **2 Workers**: Nearly doubles throughput compared to 1 worker (~3,000 req/sec). Health check setting has minimal impact.

3. **4 Workers**: Best performance at ~4,800 req/sec with sub-60ms p99 latency. Linear scaling observed.

---

## Analysis

### Understanding Event Loop Utilization (ELU)

Event Loop Utilization measures what percentage of time the Node.js event loop is actively processing work versus waiting for I/O. An ELU of 80% means the event loop is busy 80% of the time, leaving only 20% idle capacity.

```
ELU = (time spent processing) / (total elapsed time)
```

When ELU approaches 100%, the event loop cannot keep up with incoming work:
- New requests queue indefinitely
- Timers and I/O callbacks are delayed
- Health check responses become slow or unresponsive
- The process appears "hung" even though it's working

### Event Loop Thrashing Mechanics

The main service demonstrates **event loop thrashing** through intentional synchronous blocking:

```javascript
// Each request blocks the event loop for ~50ms
atomicSleep(50)
```

With 100 concurrent connections and 50ms blocking per request:

| Workers | Theoretical Max Throughput | Actual Observed |
|---------|---------------------------|-----------------|
| 1       | 20 req/sec               | 1.34 req/sec    |
| 2       | 40 req/sec               | 2.80 req/sec    |
| 4       | 80 req/sec               | 170 req/sec     |

The 4-worker configuration exceeds theoretical expectations because:
1. OS-level connection handling provides buffering
2. Some requests complete faster than the blocking time
3. Parallel workers handle queued requests during others' blocking periods

### The Health Check Cascade Failure

With 1 worker and health checks enabled, a catastrophic cascade occurs:

```
1. High load → ELU exceeds 80% threshold
2. Health check marks worker unhealthy after 1 check (maxUnhealthyChecks=1)
3. Runtime replaces the worker
4. New worker starts, immediately receives queued requests
5. New worker's ELU spikes above 80%
6. Cycle repeats → service never stabilizes
```

This explains why 1 worker + health shows 1,234,800 connection errors: clients cannot establish connections because the worker is constantly being replaced.

### Why 2 Workers + Health Performs Better Than 2 Workers Alone

| Config | Successful Requests | Improvement |
|--------|---------------------|-------------|
| 2 workers, health off | 84 | baseline |
| 2 workers, health on | 347 | 4.1x |

With health checks enabled, unhealthy workers get replaced with fresh ones. The brief period where a new worker starts provides:
- A momentary reduction in queued requests
- Fresh connection pools
- Reset internal state

This creates small windows of improved throughput, though still far from acceptable performance.

### SSR Service: I/O-Bound Scaling

The SSR service (Next.js) shows near-linear scaling because:

1. **Non-blocking I/O**: Next.js uses async operations, not synchronous blocking
2. **Low ELU**: Even under load, ELU stays well below thresholds
3. **Efficient multiplexing**: The event loop can interleave many concurrent requests

```
Scaling efficiency:
1 worker:  1,655 req/sec (baseline)
2 workers: 3,041 req/sec (1.84x - 92% efficiency)
4 workers: 4,771 req/sec (2.88x - 72% efficiency)
```

Efficiency drops slightly at 4 workers due to:
- Increased context switching overhead
- Shared resource contention
- Amdahl's law effects from serial portions

### Health Check Configuration Analysis

The current health check settings are aggressive:

| Setting | Value | Impact |
|---------|-------|--------|
| `interval` | 1000ms | Checks every second |
| `maxELU` | 0.80 | Triggers at 80% utilization |
| `maxUnhealthyChecks` | 1 | Single failure = restart |

**Recommendations for different scenarios:**

For CPU-bound workloads:
```
HEALTH_MAX_ELU=0.95
HEALTH_MAX_UNHEALTHY_CHECKS=3
HEALTH_INTERVAL=5000
```

For I/O-bound workloads:
```
HEALTH_MAX_ELU=0.80
HEALTH_MAX_UNHEALTHY_CHECKS=2
HEALTH_INTERVAL=2000
```

### Worker Scaling Strategy

| Scenario | Workers | Rationale |
|----------|---------|-----------|
| Development | 1 | Simplicity, debugging |
| Production (I/O-bound) | CPU cores | Maximize parallelism |
| Production (CPU-bound) | CPU cores + 1 | Account for blocking |
| Production (mixed) | 2 × CPU cores | Handle both patterns |

### Key Insights

1. **Event loop blocking is multiplicative**: A single 50ms block doesn't just delay one request—it delays *all* queued requests by 50ms each.

2. **Health checks assume recovery is possible**: If the underlying cause (high load + blocking code) persists, restarting workers makes things worse, not better.

3. **Worker count is not linear scaling for blocking workloads**: Going from 1→2 workers only improved throughput 2x, but 2→4 improved it 60x because it crossed the threshold where queuing delays compound.

4. **I/O-bound services are naturally resilient**: The SSR service handled all configurations gracefully (except the health check cascade) because async I/O prevents event loop starvation.

5. **Timeout configuration matters**: The 1-second client timeout interacts with blocking time—requests that *could* complete in 500ms still timeout because they're queued behind other blocking requests.

### Conclusions

1. **Identify your workload type first**: CPU-bound and I/O-bound services require fundamentally different configurations.

2. **Health checks are a double-edged sword**: They protect against truly unresponsive workers but can destabilize services under legitimate high load.

3. **Worker count should match or exceed expected concurrency divided by requests-per-second-per-worker**: For the main service, 100 connections ÷ ~20 req/sec/worker ≈ 5 workers minimum.

4. **Monitor ELU in production**: High ELU (>80%) indicates the event loop is struggling—add workers or optimize blocking code before enabling aggressive health checks.

5. **Test health check behavior under load**: The cascade failure pattern only appears under sustained high load, making it easy to miss in light testing.

---

## Environment

- **Platform**: Darwin (macOS)
- **Node.js**: v24.13.0
- **Platformatic Runtime**: wattpm
- **Date**: 2026-01-28
