import fastify from 'fastify'
import { setTimeout as sleep } from 'timers/promises'
import Piscina from 'piscina'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const server = fastify()

// Create thread pool for CPU intensive work
const pool = new Piscina({
  filename: join(__dirname, 'cpu-worker.js'),
  maxThreads: 4,
  maxQueue: 'auto'
})

server.get('/', async (request, reply) => {
  // Simulate a database query
  await sleep(10)

  if (pool.queueSize < pool.options.maxQueue) {
    // Process CPU intensive work in worker thread
    try {
      const result = await pool.run(20)
      return {
        message: 'Hello World',
        processed: true,
        threadResult: result
      }
    } catch (error) {
      return {
        message: 'Hello World',
        processed: false,
        error: 'Worker failed'
      }
    }
  } else {
    // Return cached/simplified response when queue is full
    return {
      message: 'Hello World',
      processed: false,
      reason: 'Queue full - skipped processing'
    }
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.destroy()
  server.close()
})

process.on('SIGINT', async () => {
  await pool.destroy()
  server.close()
})

await server.listen({ port: 3000 })
