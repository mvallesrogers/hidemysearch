import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { proxyUrl } from '@/lib/proxyUtils';
import { 
  handleNavigation, 
  getSecurityInfo,
  sanitizeUrl, 
  logProxyActivity
} from '@/lib/script';

interface ProxyFrameProps {
  url: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  onClose: () => void;
  onError: (message: string) => void;
  onLoad: () => void;
}

export default function ProxyFrame({ 
  url, 
  isLoading, 
  isError, 
  errorMessage, 
  onClose, 
  onError, 
  onLoad 
}: ProxyFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [secureConnection, setSecureConnection] = useState(true);
  
  useEffect(() => {
    // Use the security info utility to analyze the URL
    const securityInfo = getSecurityInfo(url);
    setSecureConnection(securityInfo.isSecure);
    logProxyActivity('Loading URL', securityInfo);
    
    // Setup message listener for iframe load events
    const handleIframeEvent = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        if (event.data === 'iframe:loaded') {
          logProxyActivity('Iframe loaded', url);
          onLoad();
        } else if (event.data.startsWith('error:')) {
          const errorMessage = event.data.substring(6);
          logProxyActivity('Iframe error', errorMessage);
          onError(errorMessage);
        } else if (event.data.startsWith('navigate:')) {
          // Handle navigation events using our utility function
          const navigationUrl = event.data.substring(9);
          if (navigationUrl) {
            logProxyActivity('Navigation requested', navigationUrl);
            handleNavigation(navigationUrl, (safeUrl: string) => {
              // If the URL is validated and ready to navigate
              const sanitizedUrl = sanitizeUrl(safeUrl);
              if (sanitizedUrl) {
                // This would be where you could navigate to the URL
                // In this case, we could update the parent component's URL state
                // For now, we'll just log it
                logProxyActivity('Safe navigation approved', sanitizedUrl);
              }
            });
          }
        }
      }
    };
    
    window.addEventListener('message', handleIframeEvent);
    
    // Set a fallback timeout in case the iframe doesn't send messages
    const loadTimer = setTimeout(() => {
      logProxyActivity('Fallback load triggered', 'Iframe did not report loaded state');
      onLoad();
    }, 5000);
    
    return () => {
      window.removeEventListener('message', handleIframeEvent);
      clearTimeout(loadTimer);
    };
  }, [url, onLoad, onError]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      // Show loading state
      onLoad();
      // Reload the iframe by resetting the src attribute
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = 'about:blank';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 100);
    }
  };

  const handleTryAgain = () => {
    // Reset error state
    onLoad();
    
    // Reload the iframe
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = 'about:blank';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 100);
    }
  };

  return (
    <div id="proxyContainer" className="w-full flex-grow relative proxy-frame-enter">
      {/* Navigation Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-2 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-400 truncate">{url}</span>
      </div>

      {/* Main Content */}
      <div className="relative flex-grow" style={{ height: 'calc(100vh - 3rem)' }}>
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-white dark:bg-slate-900 bg-opacity-90 dark:bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto proxy-loading"></div>
              <p className="mt-4 text-slate-800 dark:text-slate-200 text-lg">Loading secure connection...</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This may take a moment</p>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {isError && (
          <div className="absolute inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-10">
            <div className="text-center max-w-md px-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-white">Unable to load website</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {errorMessage || "The requested website could not be loaded. Please try again."}
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Proxy Frame */}
        <iframe
          src={`/proxy?url=${encodeURIComponent(url)}`}
          className="w-full h-full border-0"
          onLoad={onLoad}
          onError={() => onError("Failed to load the website")}
        />
      </div>
    </div>
);
              {errorMessage || "The requested website couldn't be accessed through our proxy."}
            </p>
            <div className="mt-6">
              <Button
                onClick={handleTryAgain}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Proxy frame toolbar */}
      <div className="bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button className="p-1 rounded text-slate-500 hover:text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 nav-button tooltip">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="tooltip-text">Back</span>
          </button>
          <button className="p-1 rounded text-slate-500 hover:text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 nav-button tooltip">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="tooltip-text">Forward</span>
          </button>
          <button 
            onClick={handleRefresh}
            className="p-1 rounded text-slate-500 hover:text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 nav-button tooltip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="tooltip-text">Refresh</span>
          </button>
        </div>
        
        <div className="flex-1 mx-4">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 security-indicator ${secureConnection ? 'secure' : 'warning'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <input 
              type="text" 
              readOnly 
              value={url} 
              className="block w-full pl-10 pr-10 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none enhanced-input"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className={`text-xs privacy-badge ${secureConnection ? 'secure' : 'warning'}`}>
                {secureConnection ? 'Secure' : 'Not Secure'}
              </span>
            </div>
          </div>
        </div>
        
        <div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 nav-button tooltip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="tooltip-text">Close</span>
          </button>
        </div>
      </div>
      
      {/* Iframe container */}
      <div className="relative flex-grow bg-white dark:bg-slate-900">
        <iframe 
          ref={iframeRef}
          src={proxyUrl(url)}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          className="absolute inset-0 w-full h-full border-none"
          title="Proxied content"
          onLoad={() => {
            // Check if iframe loaded successfully
            try {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                onLoad();
              }
            } catch (error) {
              // If there's a security error when trying to access contentWindow,
              // it means the iframe loaded but with a cross-origin restriction
              onLoad();
            }
          }}
          onError={() => {
            onError("Failed to load the requested website");
          }}
        />
      </div>
    </div>
  );
}
