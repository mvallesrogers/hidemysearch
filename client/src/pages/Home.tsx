import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import NavigationBar from '@/components/NavigationBar';
import SearchForm from '@/components/SearchForm';
import ProxyFrame from '@/components/ProxyFrame';
import Footer from '@/components/Footer';
import HelpModal from '@/components/HelpModal';
import useLocalStorage from '@/hooks/useLocalStorage';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface RecentSearch {
  id: number;
  url: string;
  favicon?: string | null;
  title?: string | null;
  visited_at: string;
  user_id?: number | null;
}

export default function Home() {
  const queryClient = useQueryClient();
  const [darkMode, setDarkMode] = useLocalStorage('theme', 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load recent searches from API
  const { data: recentSearches = [] } = useQuery<RecentSearch[]>({
    queryKey: ['/api/recent-searches'],
    gcTime: 0,
    onSuccess: (data) => {
      console.log('Loaded recent searches:', data?.length || 0);
    },
    onError: (error: Error) => {
      console.error('Failed to load recent searches:', error);
    }
  });

  // Save recent search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (searchData: { url: string; title?: string; favicon?: string }) => {
      const response = await apiRequest('POST', '/api/recent-searches', searchData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recent-searches'] });
    },
    onError: (error) => {
      console.error('Failed to save search:', error);
    }
  });

  // Delete recent search mutation
  const deleteSearchMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/recent-searches/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recent-searches'] });
    },
    onError: (error) => {
      console.error('Failed to delete search:', error);
    }
  });

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
    try {
      setCurrentUrl(url);
      setIsLoading(true);
      setIsError(false);
      
      // Save the search to database
      saveSearchMutation.mutate({
        url,
        favicon: `https://www.google.com/s2/favicons?domain=${url}`,
        title: new URL(url).hostname
      });
    } catch (error) {
      console.error('Error handling search:', error);
      toast({
        title: "Error",
        description: "There was a problem processing your request",
        variant: "destructive"
      });
    }
  };

  const handleProxyClose = () => {
    setCurrentUrl(null);
  };

  const handleProxyError = (message: string) => {
    setIsLoading(false);
    setIsError(true);
    setErrorMessage(message);
    toast({
      title: "Proxy Error",
      description: message || "Failed to load the requested website",
      variant: "destructive"
    });
  };

  const handleProxyLoad = () => {
    setIsLoading(false);
    toast({
      title: "Website Loaded",
      description: "You are browsing securely through our proxy",
    });
  };

  const handleRemoveSearch = (id: number) => {
    deleteSearchMutation.mutate(id);
  };

  const handleVisitAgain = (url: string) => {
    handleSearch(url);
  };

  // Initialize dark mode on mount
  useEffect(() => {
    if (darkMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
            isLoading={saveSearchMutation.isPending}
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
