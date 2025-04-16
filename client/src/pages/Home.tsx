import { useState } from 'react';
import NavigationBar from '@/components/NavigationBar';
import SearchForm from '@/components/SearchForm';
import ProxyFrame from '@/components/ProxyFrame';
import Footer from '@/components/Footer';
import HelpModal from '@/components/HelpModal';
import useLocalStorage from '@/hooks/useLocalStorage';

export default function Home() {
  const [darkMode, setDarkMode] = useLocalStorage('theme', 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState<{url: string, favicon?: string, title?: string}[]>([]);

  const toggleDarkMode = () => {
    const newMode = darkMode === 'dark' ? 'light' : 'dark';
    setDarkMode(newMode);
    if (newMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleHelpModal = () => {
    setShowHelpModal(!showHelpModal);
  };

  const handleSearch = (url: string) => {
    setCurrentUrl(url);
    setIsLoading(true);
    setIsError(false);
    
    // Check if URL already exists in recent searches
    const searchExists = recentSearches.some(search => search.url === url);
    
    if (!searchExists) {
      // Add to recent searches (would normally fetch favicon from API, but for now just add URL)
      setRecentSearches(prev => [{
        url,
        favicon: `https://www.google.com/s2/favicons?domain=${url}`,
        title: new URL(url).hostname
      }, ...prev.slice(0, 4)]); // Keep only last 5 searches
    }
  };

  const handleProxyClose = () => {
    setCurrentUrl(null);
  };

  const handleProxyError = (message: string) => {
    setIsLoading(false);
    setIsError(true);
    setErrorMessage(message);
  };

  const handleProxyLoad = () => {
    setIsLoading(false);
  };

  const handleRemoveSearch = (urlToRemove: string) => {
    setRecentSearches(prev => prev.filter(search => search.url !== urlToRemove));
  };

  const handleVisitAgain = (url: string) => {
    handleSearch(url);
  };

  // Initialize dark mode on mount
  useState(() => {
    if (darkMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-colors duration-200">
      <NavigationBar 
        onThemeToggle={toggleDarkMode} 
        onHelpClick={toggleHelpModal}
        darkMode={darkMode === 'dark'}
      />

      <main className="flex-grow flex flex-col">
        {!currentUrl ? (
          <SearchForm 
            onSearch={handleSearch}
            recentSearches={recentSearches}
            onRemoveSearch={handleRemoveSearch}
            onVisitAgain={handleVisitAgain}
          />
        ) : (
          <ProxyFrame 
            url={currentUrl}
            isLoading={isLoading}
            isError={isError}
            errorMessage={errorMessage}
            onClose={handleProxyClose}
            onError={handleProxyError}
            onLoad={handleProxyLoad}
          />
        )}
      </main>

      <Footer />

      {showHelpModal && (
        <HelpModal onClose={toggleHelpModal} />
      )}
    </div>
  );
}
