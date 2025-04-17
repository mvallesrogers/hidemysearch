/**
 * script.js - Enhanced proxy and navigation functionality for Hide My Search
 * 
 * This script provides additional functionality for the proxy browser:
 * - Improved navigation handling
 * - Enhanced page analysis
 * - Security and privacy protections
 */

/**
 * Analyzes a webpage for trackers and ads
 * @param {Document} document - The document to analyze
 * @returns {Object} Information about trackers and ads found
 */
export function analyzePageContent(document) {
  try {
    // Check for common trackers and ad scripts
    const scripts = Array.from(document.querySelectorAll('script'));
    const trackersFound = [];
    const adsFound = [];
    
    // Common tracking domains
    const trackerDomains = [
      'google-analytics.com',
      'facebook.net',
      'doubleclick.net',
      'adobe.com',
      'hotjar.com',
      'clicktale.net',
      'quantserve.com',
      'scorecardresearch.com',
    ];
    
    // Common ad network domains
    const adDomains = [
      'googleadservices.com',
      'googlesyndication.com',
      'adnxs.com',
      'rubiconproject.com',
      'advertising.com',
      'adroll.com',
      'moatads.com',
      'amazon-adsystem.com',
    ];
    
    // Analyze script sources
    scripts.forEach(script => {
      const src = script.src || '';
      
      // Check for trackers
      trackerDomains.forEach(domain => {
        if (src.includes(domain) && !trackersFound.includes(domain)) {
          trackersFound.push(domain);
        }
      });
      
      // Check for ads
      adDomains.forEach(domain => {
        if (src.includes(domain) && !adsFound.includes(domain)) {
          adsFound.push(domain);
        }
      });
    });
    
    return {
      trackers: trackersFound,
      ads: adsFound,
      trackerCount: trackersFound.length,
      adCount: adsFound.length
    };
  } catch (error) {
    console.error('Error analyzing page content:', error);
    return { trackers: [], ads: [], trackerCount: 0, adCount: 0 };
  }
}

/**
 * Detects and handles redirection attempts
 * @param {String} url - The URL to check
 * @returns {Boolean} Whether the URL should be blocked
 */
export function shouldBlockRedirect(url) {
  try {
    const urlObj = new URL(url);
    
    // List of known malicious or unwanted redirect domains
    const blockedDomains = [
      'malware-site.com',
      'scam-redirect.net',
      'data-harvester.org',
      'tracking-redirect.com'
    ];
    
    // Check if the domain should be blocked
    return blockedDomains.some(domain => urlObj.hostname.includes(domain));
  } catch (error) {
    console.error('Error checking redirect URL:', error);
    return false;
  }
}

/**
 * Gets security information about a page
 * @param {String} url - The URL to analyze
 * @returns {Object} Security information about the page
 */
export function getSecurityInfo(url) {
  try {
    const urlObj = new URL(url);
    
    return {
      protocol: urlObj.protocol,
      isSecure: urlObj.protocol === 'https:',
      host: urlObj.host,
      pathname: urlObj.pathname,
      hasQuery: urlObj.search.length > 0,
      isLocalHost: urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'
    };
  } catch (error) {
    console.error('Error getting security info:', error);
    return {
      protocol: 'unknown:',
      isSecure: false,
      host: 'unknown',
      pathname: '/',
      hasQuery: false,
      isLocalHost: false
    };
  }
}

/**
 * Handles navigation events from the proxy iframe
 * @param {String} navigationUrl - The URL to navigate to
 * @param {Function} navCallback - Callback to handle the navigation
 */
export function handleNavigation(navigationUrl, navCallback) {
  try {
    // Validate and sanitize the URL
    let url = navigationUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Check if this is a URL we should handle
    const securityInfo = getSecurityInfo(url);
    
    // Block if it's a known malicious redirect
    if (shouldBlockRedirect(url)) {
      console.warn('Blocked navigation to potentially harmful URL:', url);
      return false;
    }
    
    // Execute the navigation callback with the sanitized URL
    if (typeof navCallback === 'function') {
      navCallback(url);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error handling navigation:', error);
    return false;
  }
}

/**
 * Sanitizes a URL for safe usage
 * @param {String} url - The URL to sanitize
 * @returns {String|false} Sanitized URL or false if invalid
 */
export function sanitizeUrl(url) {
  try {
    // Add protocol if missing
    let sanitized = url;
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      sanitized = 'https://' + sanitized;
    }
    
    // Validate by trying to create a URL object
    new URL(sanitized);
    return sanitized;
  } catch (e) {
    return false;
  }
}

// For debugging
export function logProxyActivity(action, data) {
  console.log(`[HideMySearch Proxy] ${action}:`, data);
}