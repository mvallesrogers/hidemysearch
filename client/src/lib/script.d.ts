/**
 * Type definitions for the script.js file
 */

/**
 * Security information interface for proxy browsing
 */
export interface SecurityInfo {
  protocol: string;
  isSecure: boolean;
  host: string;
  pathname: string;
  hasQuery: boolean;
  isLocalHost: boolean;
}

/**
 * Page analysis results interface
 */
export interface PageAnalysisResult {
  trackers: string[];
  ads: string[];
  trackerCount: number;
  adCount: number;
}

/**
 * Analyzes a webpage for trackers and ads
 * @param document - The document to analyze
 */
export function analyzePageContent(document: Document): PageAnalysisResult;

/**
 * Detects and handles redirection attempts
 * @param url - The URL to check
 */
export function shouldBlockRedirect(url: string): boolean;

/**
 * Gets security information about a page
 * @param url - The URL to analyze
 */
export function getSecurityInfo(url: string): SecurityInfo;

/**
 * Handles navigation events from the proxy iframe
 * @param navigationUrl - The URL to navigate to
 * @param navCallback - Callback to handle the navigation
 */
export function handleNavigation(navigationUrl: string, navCallback: (url: string) => void): boolean;

/**
 * Sanitizes a URL for safe usage
 * @param url - The URL to sanitize
 */
export function sanitizeUrl(url: string): string | false;

/**
 * Logs proxy activity for debugging
 * @param action - The action being performed
 * @param data - The data associated with the action
 */
export function logProxyActivity(action: string, data: any): void;