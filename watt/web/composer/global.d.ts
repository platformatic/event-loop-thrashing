
import { FastifyInstance } from 'fastify'
import { PlatformaticApp, PlatformaticGatewayConfig } from '@platformatic/gateway'

declare module 'fastify' {
  interface FastifyInstance {
    platformatic: PlatformaticApp<PlatformaticGatewayConfig>
  }
}
