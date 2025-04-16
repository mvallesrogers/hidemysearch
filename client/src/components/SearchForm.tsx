import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface RecentSearch {
  id: number;
  url: string;
  favicon?: string | null;
  title?: string | null;
  visited_at: string;
  user_id?: number | null;
}

interface SearchFormProps {
  onSearch: (url: string) => void;
  recentSearches: RecentSearch[];
  onRemoveSearch: (id: number) => void;
  onVisitAgain: (url: string) => void;
  isLoading?: boolean;
}

export default function SearchForm({ onSearch, recentSearches, onRemoveSearch, onVisitAgain, isLoading = false }: SearchFormProps) {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [blockTrackers, setBlockTrackers] = useState(true);
  const [removeAds, setRemoveAds] = useState(false);
  const [hideIp, setHideIp] = useState(true);

  const isValidUrl = (string: string) => {
    try {
      // Add protocol if missing
      let url = string;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      new URL(url);
      return url;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedUrl = isValidUrl(urlInput);
    if (!sanitizedUrl) {
      setUrlError(true);
      return;
    }
    
    setUrlError(false);
    onSearch(sanitizedUrl);
  };

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="bg-white dark:bg-slate-800 shadow-md mb-6">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Form header */}
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">Browse Privately</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter a URL to browse through our secure proxy</p>
            </div>
            
            {/* URL form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex rounded-md shadow-sm">
                  <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <Input
                      type="text"
                      id="url"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (urlError) setUrlError(false);
                      }}
                      placeholder="https://example.com"
                      required
                      className="focus:ring-blue-600 focus:border-blue-600 block w-full rounded-none rounded-l-md pl-10 sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="relative inline-flex items-center space-x-2 px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                  >
                    <span>Browse</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Button>
                </div>
                
                {/* URL validation message */}
                {urlError && (
                  <div className="mt-2 text-sm text-red-500">
                    Please enter a valid URL
                  </div>
                )}
              </div>
              
              {/* Options and settings */}
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="blockTrackers" 
                    checked={blockTrackers} 
                    onCheckedChange={(checked) => setBlockTrackers(!!checked)} 
                    className="text-blue-600 focus:ring-blue-600"
                  />
                  <Label 
                    htmlFor="blockTrackers" 
                    className="text-sm text-slate-700 dark:text-slate-300"
                  >
                    Block trackers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="removeAds" 
                    checked={removeAds} 
                    onCheckedChange={(checked) => setRemoveAds(!!checked)} 
                    className="text-blue-600 focus:ring-blue-600"
                  />
                  <Label 
                    htmlFor="removeAds" 
                    className="text-sm text-slate-700 dark:text-slate-300"
                  >
                    Remove ads
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="incognito" 
                    checked={hideIp} 
                    onCheckedChange={(checked) => setHideIp(!!checked)} 
                    className="text-blue-600 focus:ring-blue-600"
                  />
                  <Label 
                    htmlFor="incognito" 
                    className="text-sm text-slate-700 dark:text-slate-300"
                  >
                    Hide my IP
                  </Label>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent searches */}
      <Card className="bg-white dark:bg-slate-800 shadow mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">Recent Searches</h3>
          
          {recentSearches.length > 0 ? (
            <div className="space-y-3">
              {recentSearches.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center">
                    <div className="w-6 h-6 flex-shrink-0 mr-3">
                      {item.favicon && (
                        <img 
                          src={item.favicon} 
                          alt="Site favicon" 
                          className="w-full h-full object-contain"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {item.title || new URL(item.url).hostname}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => onVisitAgain(item.url)}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:hover:text-blue-400"
                    >
                      Visit Again
                    </button>
                    <button 
                      onClick={() => onRemoveSearch(item.id)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent searches</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
