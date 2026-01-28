# Experimental results

All tests run with: `autocannon -c 50 -d 10 -t 1 --renderStatusCodes http://127.0.0.1:3000`
(50 connections, 10 second duration, 1 second timeout)

## Summary Table

| Server | Avg Req/s | 200 OK | Errors | Avg Latency | Max Latency |
|--------|-----------|--------|--------|-------------|-------------|
| `server.js` | 4.1 | 41 | 450 timeouts | 511ms | 982ms |
| `server-protected.js` | 21,170 | 166 | 192 timeouts | 0.89ms | 998ms |
| `server-load-aware.js` | 145 | 1,450 | 437 timeouts | 43ms | 992ms |
| `server-threaded.js` | 170 | 1,704 | 17 timeouts | 277ms | 970ms |
| `server-threaded-protected.js` | 2,830 | 28,292 | 0 | 17ms | 263ms |

---

## `server.js`

Basic Fastify server with no protection. Uses route.js which has 10ms async delay + 20ms synchronous CPU work.

```bash
$ autocannon -c 50 -d 10 -t 1 --renderStatusCodes http://127.0.0.1:3000
Running 10s test @ http://127.0.0.1:3000
50 connections

┌─────────┬───────┬────────┬────────┬────────┬───────────┬───────────┬────────┐
│ Stat    │ 2.5%  │ 50%    │ 97.5%  │ 99%    │ Avg       │ Stdev     │ Max    │
├─────────┼───────┼────────┼────────┼────────┼───────────┼───────────┼────────┤
│ Latency │ 63 ms │ 512 ms │ 957 ms │ 982 ms │ 511.13 ms │ 276.54 ms │ 982 ms │
└─────────┴───────┴────────┴────────┴────────┴───────────┴───────────┴────────┘
┌───────────┬─────┬──────┬─────┬─────────┬───────┬─────────┬─────────┐
│ Stat      │ 1%  │ 2.5% │ 50% │ 97.5%   │ Avg   │ Stdev   │ Min     │
├───────────┼─────┼──────┼─────┼─────────┼───────┼─────────┼─────────┤
│ Req/Sec   │ 0   │ 0    │ 0   │ 41      │ 4.1   │ 12.3    │ 41      │
├───────────┼─────┼──────┼─────┼─────────┼───────┼─────────┼─────────┤
│ Bytes/Sec │ 0 B │ 0 B  │ 0 B │ 7.22 kB │ 722 B │ 2.17 kB │ 7.22 kB │
└───────────┴─────┴──────┴─────┴─────────┴───────┴─────────┴─────────┘
┌──────┬───────┐
│ Code │ Count │
├──────┼───────┤
│ 200  │ 41    │
└──────┴───────┘

Req/Bytes counts sampled once per second.
# of samples: 10

541 requests in 10.01s, 7.22 kB read
450 errors (450 timeouts)
```

**Conclusions:**
- Server can only handle ~41 req/s due to synchronous CPU blocking
- Under load, latency spikes to 500ms+ average
- 83% of requests timeout (450 out of 541)
- Catastrophic failure under load - the event loop is completely blocked

---

## `server-protected.js`

Server with `@fastify/under-pressure` middleware that returns 503 when the event loop is overloaded.

```bash
$ autocannon -c 50 -d 10 -t 1 --renderStatusCodes http://127.0.0.1:3000
Running 10s test @ http://127.0.0.1:3000
50 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬──────────┬────────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev    │ Max    │
├─────────┼──────┼──────┼───────┼──────┼─────────┼──────────┼────────┤
│ Latency │ 0 ms │ 0 ms │ 0 ms  │ 0 ms │ 0.89 ms │ 24.05 ms │ 998 ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴──────────┴────────┘
┌───────────┬─────┬──────┬────────┬─────────┬──────────┬───────────┬─────────┐
│ Stat      │ 1%  │ 2.5% │ 50%    │ 97.5%   │ Avg      │ Stdev     │ Min     │
├───────────┼─────┼──────┼────────┼─────────┼──────────┼───────────┼─────────┤
│ Req/Sec   │ 0   │ 0    │ 891    │ 70,719  │ 21,170.3 │ 27,679.43 │ 41      │
├───────────┼─────┼──────┼────────┼─────────┼──────────┼───────────┼─────────┤
│ Bytes/Sec │ 0 B │ 0 B  │ 279 kB │ 22.2 MB │ 6.64 MB  │ 8.69 MB   │ 7.22 kB │
└───────────┴─────┴──────┴────────┴─────────┴──────────┴───────────┴─────────┘
┌──────┬────────┐
│ Code │ Count  │
├──────┼────────┤
│ 200  │ 166    │
├──────┼────────┤
│ 503  │ 211515 │
└──────┴────────┘

Req/Bytes counts sampled once per second.
# of samples: 10

166 2xx responses, 211515 non 2xx responses
212k requests in 10.01s, 66.4 MB read
192 errors (192 timeouts)
```

**Conclusions:**
- Server stays responsive by rejecting requests with 503
- Only 166 successful responses out of 211,681 total
- 99.9% of requests get rejected (503) when under pressure
- Still some timeouts (192), but server remains stable
- Good for protecting downstream services, but poor user experience

---

## `server-load-aware.js`

Server that uses `@fastify/under-pressure` to detect load and skips CPU-intensive work when under pressure.

```bash
$ autocannon -c 50 -d 10 -t 1 --renderStatusCodes http://127.0.0.1:3000
Running 10s test @ http://127.0.0.1:3000
50 connections

┌─────────┬───────┬───────┬────────┬────────┬──────────┬───────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5%  │ 99%    │ Avg      │ Stdev     │ Max    │
├─────────┼───────┼───────┼────────┼────────┼──────────┼───────────┼────────┤
│ Latency │ 10 ms │ 11 ms │ 644 ms │ 828 ms │ 42.64 ms │ 141.51 ms │ 992 ms │
└─────────┴───────┴───────┴────────┴────────┴──────────┴───────────┴────────┘
┌───────────┬─────┬──────┬─────┬────────┬─────────┬─────────┬─────────┐
│ Stat      │ 1%  │ 2.5% │ 50% │ 97.5%  │ Avg     │ Stdev   │ Min     │
├───────────┼─────┼──────┼─────┼────────┼─────────┼─────────┼─────────┤
│ Req/Sec   │ 0   │ 0    │ 0   │ 1,409  │ 145     │ 421.52  │ 41      │
├───────────┼─────┼──────┼─────┼────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec │ 0 B │ 0 B  │ 0 B │ 248 kB │ 25.5 kB │ 74.2 kB │ 7.22 kB │
└───────────┴─────┴──────┴─────┴────────┴─────────┴─────────┴─────────┘
┌──────┬───────┐
│ Code │ Count │
├──────┼───────┤
│ 200  │ 1450  │
└──────┴───────┘

Req/Bytes counts sampled once per second.
# of samples: 10

2k requests in 10.02s, 255 kB read
437 errors (437 timeouts)
```

**Conclusions:**
- Much better than basic server: 1,450 successful responses vs 41
- All requests return 200 OK (no 503 errors)
- Still has 437 timeouts due to non-predictive circuit breaker
- Latency varies wildly (10ms when skipping CPU work, 600ms+ when not)
- Good approach: graceful degradation rather than rejection

---

## `server-threaded.js`

Server using Piscina thread pool to offload CPU-intensive work to worker threads (no queue protection).

```bash
$ autocannon -c 50 -d 10 -t 1 --renderStatusCodes http://127.0.0.1:3000
Running 10s test @ http://127.0.0.1:3000
50 connections

┌─────────┬────────┬────────┬────────┬────────┬───────────┬───────────┬────────┐
│ Stat    │ 2.5%   │ 50%    │ 97.5%  │ 99%    │ Avg       │ Stdev     │ Max    │
├─────────┼────────┼────────┼────────┼────────┼───────────┼───────────┼────────┤
│ Latency │ 155 ms │ 176 ms │ 679 ms │ 794 ms │ 277.47 ms │ 155.63 ms │ 970 ms │
└─────────┴────────┴────────┴────────┴────────┴───────────┴───────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬─────────┬───────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Stdev │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼───────┼─────────┤
│ Req/Sec   │ 168     │ 168     │ 170     │ 173     │ 170.4   │ 1.86  │ 168     │
├───────────┼─────────┼─────────┼─────────┼─────────┼─────────┼───────┼─────────┤
│ Bytes/Sec │ 50.9 kB │ 50.9 kB │ 51.5 kB │ 52.4 kB │ 51.6 kB │ 569 B │ 50.9 kB │
└───────────┴─────────┴─────────┴─────────┴─────────┴─────────┴───────┴─────────┘
┌──────┬───────┐
│ Code │ Count │
├──────┼───────┤
│ 200  │ 1704  │
└──────┴───────┘

Req/Bytes counts sampled once per second.
# of samples: 10

2k requests in 10.01s, 516 kB read
17 errors (17 timeouts)
```

**Conclusions:**
- Very consistent throughput: 170 req/s with minimal variance
- 1,704 successful responses with only 17 timeouts (99% success)
- Event loop stays free - latency is predictable
- Higher baseline latency (155ms+) due to thread pool queue
- Without queue protection, requests pile up waiting for workers

---

## `server-threaded-protected.js`

Server using Piscina thread pool with queue-based protection - skips CPU work when queue is full.

```bash
$ autocannon -c 50 -d 10 -t 1 --renderStatusCodes http://127.0.0.1:3000
Running 10s test @ http://127.0.0.1:3000
50 connections

┌─────────┬──────┬───────┬────────┬────────┬─────────┬──────────┬────────┐
│ Stat    │ 2.5% │ 50%   │ 97.5%  │ 99%    │ Avg     │ Stdev    │ Max    │
├─────────┼──────┼───────┼────────┼────────┼─────────┼──────────┼────────┤
│ Latency │ 9 ms │ 10 ms │ 125 ms │ 166 ms │ 17.1 ms │ 28.52 ms │ 263 ms │
└─────────┴──────┴───────┴────────┴────────┴─────────┴──────────┴────────┘
┌───────────┬────────┬────────┬────────┬────────┬─────────┬─────────┬────────┐
│ Stat      │ 1%     │ 2.5%   │ 50%    │ 97.5%  │ Avg     │ Stdev   │ Min    │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Req/Sec   │ 2,757  │ 2,757  │ 2,839  │ 2,873  │ 2,829.6 │ 38.48   │ 2,756  │
├───────────┼────────┼────────┼────────┼────────┼─────────┼─────────┼────────┤
│ Bytes/Sec │ 716 kB │ 716 kB │ 738 kB │ 746 kB │ 735 kB  │ 9.95 kB │ 716 kB │
└───────────┴────────┴────────┴────────┴────────┴─────────┴─────────┴────────┘
┌──────┬───────┐
│ Code │ Count │
├──────┼───────┤
│ 200  │ 28292 │
└──────┴───────┘

Req/Bytes counts sampled once per second.
# of samples: 10

28k requests in 10.01s, 7.35 MB read
```

**Conclusions:**
- **Best overall performance**: 2,830 req/s with 0 errors
- 28,292 successful responses - 690x more than basic server
- Excellent latency: 17ms average, 263ms max (well under 1s timeout)
- Queue protection prevents backpressure buildup
- Combines thread pool benefits with graceful degradation

---

## Key Takeaways

1. **Basic server** fails catastrophically under load - 20ms of sync CPU work blocks everything
2. **Under-pressure protection** keeps server alive but rejects most requests (503)
3. **Load-aware degradation** is better - serves partial results instead of rejecting
4. **Thread pool** offloads CPU work but queue can still build up
5. **Thread pool + queue protection** is the best approach:
   - Offloads CPU work to keep event loop free
   - Skips processing when queue is full
   - Maintains low latency and high throughput
   - Zero errors under heavy load

The combination of worker threads and queue-based backpressure provides the best balance of throughput, latency, and reliability.
