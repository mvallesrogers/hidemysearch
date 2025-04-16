import { useState } from 'react';
import { Link } from 'wouter';

interface NavigationBarProps {
  onThemeToggle: () => void;
  onHelpClick: () => void;
  darkMode: boolean;
}

export default function NavigationBar({ onThemeToggle, onHelpClick, darkMode }: NavigationBarProps) {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <div className="flex items-center cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h1 className="ml-2 text-xl font-semibold text-blue-600">Hide My Search</h1>
                </div>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <button 
              onClick={onThemeToggle}
              className="p-1 rounded-full text-slate-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
              aria-label="Toggle dark mode"
            >
              {/* Sun icon (for dark mode) */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-6 w-6 ${darkMode ? 'block' : 'hidden'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
                />
              </svg>
              {/* Moon icon (for light mode) */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-6 w-6 ${darkMode ? 'hidden' : 'block'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
                />
              </svg>
            </button>
            
            {/* Help button */}
            <button 
              onClick={onHelpClick}
              className="p-1 rounded-full text-slate-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
              aria-label="Help"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
