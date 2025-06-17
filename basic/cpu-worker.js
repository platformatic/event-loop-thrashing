import atomicSleep from 'atomic-sleep'

export default function cpuIntensiveWork(duration = 20) {
  // Simulate CPU intensive work that would normally block the event loop
  atomicSleep(duration)
  
  // Return some result to simulate actual processing
  return {
    processedAt: Date.now(),
    duration,
    result: 'CPU work completed'
  }
}