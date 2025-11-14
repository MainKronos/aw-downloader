import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import app from '@adonisjs/core/services/app'

/**
 * Middleware to serve index.html for non-API routes that return 404
 * This enables client-side routing for the Next.js SPA
 * 
 * The middleware works in conjunction with static_middleware:
 * 1. static_middleware attempts to serve the file from public/
 * 2. If file not found (404) and not an API route, serve index.html
 */
export default class ServeIndexMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const url = request.url()
    
    // Skip API routes - let them go through normal routing
    if (url.startsWith('/api/')) {
      return next()
    }
    
    // Continue with the request
    const output = await next()
    
    // If we got a 404 and it's not an API route or static asset request,
    // serve index.html for client-side routing
    const status = response.getStatus()
    
    if (status === 404 && !url.startsWith('/api/')) {
      // Don't serve index.html for requests that look like static assets
      // (they should return 404 if not found)

      const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|txt)$/i.test(url.replace(/\?.*$/, ''))
      
      if (!isStaticAsset) {
        try {
          const indexPath = app.publicPath('index.html')
          return response.download(indexPath)
        } catch (error) {
          // If index.html doesn't exist, let the 404 through
          return output
        }
      }
    }
    
    return output
  }
}
