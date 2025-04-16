/**
 * Returns a proxied URL using the server-side CORS proxy
 * @param url The URL to proxy
 * @returns The proxied URL that can be used in an iframe
 */
export function proxyUrl(url: string): string {
  // Use our server-side proxy to avoid CORS issues
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Sanitizes a URL by ensuring it has a protocol
 * @param url The URL to sanitize
 * @returns The sanitized URL or false if invalid
 */
export function sanitizeUrl(url: string): string | false {
  try {
    // Add protocol if missing
    let sanitized = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      sanitized = 'https://' + url;
    }
    
    // Validate URL
    new URL(sanitized);
    return sanitized;
  } catch (error) {
    return false;
  }
}
