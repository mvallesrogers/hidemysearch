import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";

// Helper function to validate URLs
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Helper function to sanitize URLs
function sanitizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Proxy endpoint to handle CORS
  app.get('/api/proxy', async (req: Request, res: Response) => {
    try {
      const urlParam = req.query.url as string;
      
      if (!urlParam) {
        return res.status(400).json({ message: 'URL parameter is required' });
      }
      
      // Validate and sanitize the URL
      let url = sanitizeUrl(urlParam);
      if (!isValidUrl(url)) {
        return res.status(400).json({ message: 'Invalid URL provided' });
      }
      
      // Fetch the target URL
      const response = await fetch(url, {
        headers: {
          // Forward user agent to make the request look like a regular browser
          'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
          // Add referer to prevent referer blocking
          'Referer': url,
          // Add origin header
          'Origin': 'null'
        }
      });
      
      // Get content type to set proper response headers
      const contentType = response.headers.get('content-type') || 'text/html';
      
      // Set headers for CORS and caching
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // Stream the response to client
      const body = await response.buffer();
      
      // If it's HTML content, we may need to rewrite URLs to ensure resources load through our proxy
      if (contentType.includes('text/html')) {
        let html = body.toString();
        
        // Replace absolute URLs in src and href attributes
        html = html.replace(/((href|src)=["'])(?:https?:\/\/[^"']+)(["'])/gi, 
          (match, prefix, attr, suffix) => {
            // Extract the URL from the attribute
            const urlMatch = match.match(/["'](https?:\/\/[^"']+)["']/i);
            if (urlMatch && urlMatch[1]) {
              const resourceUrl = urlMatch[1];
              return `${prefix}/api/proxy?url=${encodeURIComponent(resourceUrl)}${suffix}`;
            }
            return match;
          }
        );
        
        // Also handle CSS url() references
        // This is a simplified approach and might need more robust handling
        html = html.replace(/url\(['"]?(https?:\/\/[^)"']+)['"]?\)/gi, 
          (match, resourceUrl) => {
            return `url('/api/proxy?url=${encodeURIComponent(resourceUrl)}')`;
          }
        );
        
        res.send(html);
      } else {
        // For non-HTML content, just send the buffer
        res.send(body);
      }
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ 
        message: 'Failed to proxy the request',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
