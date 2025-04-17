import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { recentSearches, insertRecentSearchSchema, type InsertRecentSearch } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import * as bodyParser from "body-parser";

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
  // Custom middleware to handle raw bodies for the proxy endpoint
  app.use('/api/proxy', (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET and HEAD requests
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    // Use raw body parser for content passing to remote servers
    bodyParser.raw({ 
      type: '*/*',
      limit: '50mb'
    })(req, res, next);
  });
  // Get recent searches
  app.get('/api/recent-searches', async (req: Request, res: Response) => {
    try {
      const searches = await db.select().from(recentSearches).orderBy(desc(recentSearches.visited_at)).limit(10);
      res.json(searches);
    } catch (error) {
      console.error('Error fetching recent searches:', error);
      res.status(500).json({ message: 'Failed to fetch recent searches' });
    }
  });

  // Site analysis endpoint - provides metadata about a site
  app.get('/api/analyze-site', async (req: Request, res: Response) => {
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
          'User-Agent': 'Mozilla/5.0 (compatible; ProxyBot/1.0)',
          'Accept': 'text/html',
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        return res.status(response.status).json({ 
          message: `Failed to analyze site: ${response.statusText}`,
          status: response.status
        });
      }

      // Get basic site info
      const protocol = new URL(url).protocol;
      const isSecure = protocol === 'https:';
      const contentType = response.headers.get('content-type') || 'unknown';
      const server = response.headers.get('server') || 'unknown';

      // Analyze security headers
      const securityHeaders = {
        'content-security-policy': response.headers.get('content-security-policy'),
        'strict-transport-security': response.headers.get('strict-transport-security'),
        'x-content-type-options': response.headers.get('x-content-type-options'),
        'x-frame-options': response.headers.get('x-frame-options'),
        'x-xss-protection': response.headers.get('x-xss-protection'),
        'referrer-policy': response.headers.get('referrer-policy'),
        'permissions-policy': response.headers.get('permissions-policy'),
      };

      // Return the analysis results
      res.json({
        url,
        protocol,
        isSecure,
        contentType,
        server,
        securityHeaders,
        status: response.status,
        statusText: response.statusText
      });
    } catch (error) {
      console.error('Site analysis error:', error);
      res.status(500).json({ 
        message: 'Failed to analyze the site',
        error: error instanceof Error ? error.message : String(error)
      });
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

  // Options endpoint to handle CORS preflight requests
  app.options('/api/proxy', (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HTTP-Method-Override');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.sendStatus(200);
  });

  // Proxy endpoint to handle CORS - support all methods
  app.all('/api/proxy', async (req: Request, res: Response) => {
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

      // Forward all relevant headers from the original request
      const headers: Record<string, string> = {
        // Use a comprehensive browser user agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Add referer to prevent referer blocking
        'Referer': url,
        // Add origin header
        'Origin': 'null',
        // Accept everything
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        // Common accept-encoding values
        'Accept-Encoding': 'gzip, deflate, br',
        // Accept-Language
        'Accept-Language': 'en-US,en;q=0.9',
        // Upgrade-Insecure-Requests
        'Upgrade-Insecure-Requests': '1',
        // Cache control
        'Cache-Control': 'max-age=0',
        // For mobile content
        'Viewport-Width': '1024',
        // For cross-origin sites
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        // For secure connections
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      };

      // Forward cookies if present
      if (req.headers.cookie) {
        headers.Cookie = req.headers.cookie as string;
      }

      // Forward authorization if present
      if (req.headers.authorization) {
        headers.Authorization = req.headers.authorization as string;
      }

      // Handle content type headers for POST requests
      if (req.method === 'POST' && req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'] as string;
      }

      // Fetch the target URL with all headers
      const response = await fetch(url, {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
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
          'last-modified', 'etag', 'vary', 'content-encoding',
          'content-language', 'expires', 'pragma', 'cache-control',
          'accept-ranges', 'content-range', 'set-cookie'
        ];
        if (safeHeaderKeys.includes(key.toLowerCase())) {
          // Handle set-cookie specially
          if (key.toLowerCase() === 'set-cookie') {
            res.setHeader(key, value);
          } else {
            res.setHeader(key, value);
          }
        }
      }

      // Set comprehensive headers for CORS and security to ensure maximum compatibility
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HTTP-Method-Override');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      // Most permissive CSP to allow all content types from all sources
      res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * data: blob:; img-src * data: blob:; media-src * data: blob:; font-src * data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';");

      // Stream the response to client
      const arrayBuffer = await response.arrayBuffer();
      const body = Buffer.from(arrayBuffer);

      // If it's HTML content, rewrite URLs to ensure resources load through our proxy
      if (contentType.includes('text/html')) {
        let html = body.toString();

        // More comprehensive HTML attribute handling
        // Replace absolute URLs in all HTML attributes that might contain URLs
        const urlAttributes = ['href', 'src', 'action', 'data-src', 'srcset', 'data-srcset', 'poster', 'background', 'formaction', 'cite', 'longdesc', 'usemap'];
        const attributePattern = new RegExp(`((?:${urlAttributes.join('|')})=["'])(?:https?:\\/\\/[^"']+)(["'])`, 'gi');

        html = html.replace(attributePattern, 
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

        // Handle srcset attributes (multiple URLs)
        html = html.replace(/srcset=["']([^"']+)["']/gi, (match, srcset) => {
          const newSrcset = srcset.split(',').map(src => {
            const [url, descriptor] = src.trim().split(/\s+/);
            if (url.startsWith('http')) {
              return `/api/proxy?url=${encodeURIComponent(url)}${descriptor ? ' '+descriptor : ''}`;
            } else if (url.startsWith('/')) {
              try {
                const originalUrlObj = new URL(url);
                const base = `${originalUrlObj.protocol}//${originalUrlObj.host}`;
                return `/api/proxy?url=${encodeURIComponent(`${base}${url}`)}${descriptor ? ' '+descriptor : ''}`;
              } catch {
                return src;
              }
            }
            return src;
          }).join(', ');

          return `srcset="${newSrcset}"`;
        });

        // Handle relative URLs in all HTML attributes
        const relativeUrlPattern = new RegExp(`((?:${urlAttributes.join('|')})=["'])\\/([^"']*)(["'])`, 'gi');
        html = html.replace(relativeUrlPattern,
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

        // Handle CSS url() references - both absolute and relative
        html = html.replace(/url\(['"]?([^)"']+)['"]?\)/gi, 
          (match, resourceUrl) => {
            if (resourceUrl.startsWith('http')) {
              return `url('/api/proxy?url=${encodeURIComponent(resourceUrl)}')`;
            } else if (resourceUrl.startsWith('/')) {
              try {
                const originalUrlObj = new URL(url);
                const base = `${originalUrlObj.protocol}//${originalUrlObj.host}`;
                return `url('/api/proxy?url=${encodeURIComponent(`${base}${resourceUrl}`)}')`;
              } catch {
                return match;
              }
            }
            return match;
          }
        );

        // Handle inline styles with background-image
        html = html.replace(/style=["']([^"']*)background-image:url\(([^)]+)\)([^"']*)["']/gi,
          (match, prefix, bgUrl, suffix) => {
            // Clean the URL
            const cleanBgUrl = bgUrl.replace(/['"]/g, '').trim();

            if (cleanBgUrl.startsWith('http')) {
              return `style="${prefix}background-image:url('/api/proxy?url=${encodeURIComponent(cleanBgUrl)}')${suffix}"`;
            } else if (cleanBgUrl.startsWith('/')) {
              try {
                const originalUrlObj = new URL(url);
                const base = `${originalUrlObj.protocol}//${originalUrlObj.host}`;
                return `style="${prefix}background-image:url('/api/proxy?url=${encodeURIComponent(`${base}${cleanBgUrl}`)}')${suffix}"`;
              } catch {
                return match;
              }
            }
            return match;
          }
        );

        // Handle javascript with location references
        html = html.replace(/window\.location/g, "window.parent.postMessage('navigate:', '*'); window.location");

        // Add base tag for relative links
        const baseTag = `<base href="${url}">`;
        html = html.replace(/<head[^>]*>/, match => `${match}${baseTag}`);

        // Add script to handle form submissions and notify parent window
        const enhancementScript = `
        <script>
          // Notify parent window when page is fully loaded
          window.addEventListener('load', function() {
            window.parent.postMessage('iframe:loaded', '*');
          });

          // Catch errors and send them to parent
          window.addEventListener('error', function(e) {
            window.parent.postMessage('error:' + e.message, '*');
            return false;
          });

          // Handle all link clicks
          document.addEventListener('click', function(e) {
            // Find closest anchor tag
            let target = e.target;
            while (target && target.tagName !== 'A') {
              target = target.parentElement;
            }

            // If we found an anchor and it has an href
            if (target && target.tagName === 'A' && target.href) {
              // Only process if it's not already handled by our proxy
              if (!target.href.includes('/api/proxy')) {
                e.preventDefault();
                window.location.href = '/api/proxy?url=' + encodeURIComponent(target.href);
              }
            }
          }, true);

          // Intercept all XHR requests
          (function(open) {
            XMLHttpRequest.prototype.open = function(method, url) {
              // Only proxy absolute or root-relative URLs
              if (url.startsWith('http') || url.startsWith('/')) {
                // If it's a relative URL, convert to absolute based on current page
                const absoluteUrl = url.startsWith('http') ? url : new URL(url, window.location.href).toString();
                arguments[1] = '/api/proxy?url=' + encodeURIComponent(absoluteUrl);
              }
              return open.apply(this, arguments);
            };
          })(XMLHttpRequest.prototype.open);

          // Intercept fetch requests
          (function(fetch) {
            window.fetch = function(resource, init) {
              // Handle both string URLs and Request objects
              let url = resource;
              if (resource instanceof Request) {
                url = resource.url;
              }

              // Only proxy absolute or root-relative URLs
              if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('/'))) {
                // If it's a relative URL, convert to absolute based on current page
                const absoluteUrl = url.startsWith('http') ? url : new URL(url, window.location.href).toString();
                const proxiedUrl = '/api/proxy?url=' + encodeURIComponent(absoluteUrl);

                if (resource instanceof Request) {
                  resource = new Request(proxiedUrl, resource);
                } else {
                  resource = proxiedUrl;
                }
              }

              return fetch.call(this, resource, init);
            };
          })(window.fetch);

          // Handle form submissions
          document.addEventListener('DOMContentLoaded', function() {
            // Send load notification again after DOM content loaded
            window.parent.postMessage('iframe:loaded', '*');

            // Handle form submissions
            document.querySelectorAll('form').forEach(form => {
              form.addEventListener('submit', function(e) {
                e.preventDefault();
                const formAction = this.action || window.location.href;
                const formMethod = this.method || 'GET';
                const formData = new FormData(this);

                if (formMethod.toUpperCase() === 'GET') {
                  const queryString = new URLSearchParams(formData).toString();
                  const separator = formAction.includes('?') ? '&' : '?';
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(formAction + separator + queryString);
                } else {
                  // POST handling
                  const xhr = new XMLHttpRequest();
                  xhr.open(formMethod, '/api/proxy?url=' + encodeURIComponent(formAction), true);
                  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                  xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                      if (xhr.status >= 200 && xhr.status < 400) {
                        // Create a DOM parser to handle the response HTML
                        const parser = new DOMParser();
                        const responseDoc = parser.parseFromString(xhr.responseText, 'text/html');

                        // Replace the current document's HTML
                        document.documentElement.innerHTML = responseDoc.documentElement.innerHTML;

                        // Execute any scripts in the new document
                        const scripts = document.getElementsByTagName('script');
                        for (let i = 0; i < scripts.length; i++) {
                          if (scripts[i].text) {
                            try {
                              eval(scripts[i].text);
                            } catch (error) {
                              console.error('Error executing script:', error);
                            }
                          }
                        }

                        // Notify parent that we've loaded new content
                        window.parent.postMessage('iframe:loaded', '*');
                      } else {
                        console.error('Form submission failed:', xhr.status);
                        window.parent.postMessage('error:Form submission failed with status ' + xhr.status, '*');
                      }
                    }
                  };
                  xhr.send(new URLSearchParams(formData).toString());
                }
              });
            });
          });

          // Fix window.open to use proxy
          const originalWindowOpen = window.open;
          window.open = function(url, name, specs) {
            if (url && (url.startsWith('http') || url.startsWith('/'))) {
              const absoluteUrl = url.startsWith('http') ? url : new URL(url, window.location.href).toString();
              return originalWindowOpen.call(window, '/api/proxy?url=' + encodeURIComponent(absoluteUrl), name, specs);
            }
            return originalWindowOpen.call(window, url, name, specs);
          };
        </script>
        `;

        html = html.replace('</head>', `${enhancementScript}</head>`);

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

  app.get('/proxy', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send('URL parameter is required');
      }

      const response = await fetch(targetUrl);
      const contentType = response.headers.get('content-type') || 'text/plain';

      res.setHeader('Content-Type', contentType);
      response.body.pipe(res);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).send('Failed to proxy request');
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}