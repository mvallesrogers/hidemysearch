import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { recentSearches, insertRecentSearchSchema, type InsertRecentSearch } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

// Setup database connection
const client = postgres(process.env.DATABASE_URL!);
// Create Drizzle instance
const db = drizzle(client);

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
  // Get recent searches
  app.get('/api/recent-searches', async (req: Request, res: Response) => {
    try {
      const searches = await db.select().from(recentSearches).orderBy(recentSearches.visited_at).limit(10);
      res.json(searches);
    } catch (error) {
      console.error('Error fetching recent searches:', error);
      res.status(500).json({ message: 'Failed to fetch recent searches' });
    }
  });

  // Save a recent search
  app.post('/api/recent-searches', async (req: Request, res: Response) => {
    try {
      const { url, title, favicon } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }

      const sanitizedUrl = sanitizeUrl(url);
      if (!isValidUrl(sanitizedUrl)) {
        return res.status(400).json({ message: 'Invalid URL provided' });
      }

      const search: InsertRecentSearch = {
        url: sanitizedUrl,
        title: title || new URL(sanitizedUrl).hostname,
        favicon: favicon || `https://www.google.com/s2/favicons?domain=${sanitizedUrl}`,
      };

      // Check if the URL already exists in recent searches
      const existing = await db.select().from(recentSearches).where(eq(recentSearches.url, sanitizedUrl));
      
      if (existing.length > 0) {
        // Update the timestamp
        await db.update(recentSearches)
          .set({ visited_at: new Date() })
          .where(eq(recentSearches.url, sanitizedUrl));
        
        res.json(existing[0]);
      } else {
        // Insert new search
        const inserted = await db.insert(recentSearches).values(search).returning();
        res.json(inserted[0]);
      }
    } catch (error) {
      console.error('Error saving recent search:', error);
      res.status(500).json({ message: 'Failed to save recent search' });
    }
  });

  // Delete a recent search
  app.delete('/api/recent-searches/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID provided' });
      }

      await db.delete(recentSearches).where(eq(recentSearches.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting recent search:', error);
      res.status(500).json({ message: 'Failed to delete recent search' });
    }
  });

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
          'Origin': 'null',
          // Accept header
          'Accept': '*/*',
          // Accept-Encoding
          'Accept-Encoding': 'gzip, deflate, br',
          // Accept-Language
          'Accept-Language': 'en-US,en;q=0.9',
          // Upgrade-Insecure-Requests
          'Upgrade-Insecure-Requests': '1'
        },
        // Follow redirects
        redirect: 'follow'
      });
      
      // Get content type to set proper response headers
      const contentType = response.headers.get('content-type') || 'text/html';
      
      // Forward relevant headers
      for (const [key, value] of response.headers.entries()) {
        // Only forward headers that are safe and won't cause issues
        const safeHeaderKeys = [
          'content-type', 'content-length', 'date', 'connection', 
          'last-modified', 'etag', 'vary', 'content-encoding'
        ];
        if (safeHeaderKeys.includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }
      
      // Set headers for CORS and security
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
      
      // Stream the response to client
      const body = await response.buffer();
      
      // If it's HTML content, rewrite URLs to ensure resources load through our proxy
      if (contentType.includes('text/html')) {
        let html = body.toString();
        
        // Replace absolute URLs in src and href attributes
        html = html.replace(/((?:href|src|action)=["'])(?:https?:\/\/[^"']+)(["'])/gi, 
          (match, prefix, suffix) => {
            // Extract the URL from the attribute
            const urlMatch = match.match(/["'](https?:\/\/[^"']+)["']/i);
            if (urlMatch && urlMatch[1]) {
              const resourceUrl = urlMatch[1];
              return `${prefix}/api/proxy?url=${encodeURIComponent(resourceUrl)}${suffix}`;
            }
            return match;
          }
        );
        
        // Handle relative URLs
        html = html.replace(/((?:href|src|action)=["'])\/([^"']*)(["'])/gi,
          (match, prefix, relativeUrl, suffix) => {
            // Extract host from the original URL
            try {
              const originalUrlObj = new URL(url);
              const base = `${originalUrlObj.protocol}//${originalUrlObj.host}`;
              return `${prefix}/api/proxy?url=${encodeURIComponent(`${base}/${relativeUrl}`)}${suffix}`;
            } catch {
              return match;
            }
          }
        );
        
        // Handle CSS url() references
        html = html.replace(/url\(['"]?(https?:\/\/[^)"']+)['"]?\)/gi, 
          (match, resourceUrl) => {
            return `url('/api/proxy?url=${encodeURIComponent(resourceUrl)}')`;
          }
        );
        
        // Handle javascript with location references
        html = html.replace(/window\.location/g, "window.parent.postMessage('navigate:', '*'); window.location");
        
        // Add base tag for relative links
        const baseTag = `<base href="${url}">`;
        html = html.replace(/<head[^>]*>/, match => `${match}${baseTag}`);
        
        // Add script to handle form submissions
        const formHandlerScript = `
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            // Handle form submissions
            document.querySelectorAll('form').forEach(form => {
              form.addEventListener('submit', function(e) {
                e.preventDefault();
                const formAction = this.action || window.location.href;
                const formMethod = this.method || 'GET';
                const formData = new FormData(this);
                
                if (formMethod.toUpperCase() === 'GET') {
                  const queryString = new URLSearchParams(formData).toString();
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(formAction + '?' + queryString);
                } else {
                  // For non-GET methods, we would need server-side handling
                  alert('Form submissions with method ' + formMethod + ' are not supported in proxy mode.');
                }
              });
            });
          });
        </script>
        `;
        
        html = html.replace('</head>', `${formHandlerScript}</head>`);
        
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
