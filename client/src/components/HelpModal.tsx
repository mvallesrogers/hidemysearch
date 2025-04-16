import { Button } from '@/components/ui/button';

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 overflow-y-auto z-50">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-slate-500 opacity-75" onClick={onClose}></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-slate-900 dark:text-white">
                  How to Use Hide My Search
                </h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">Browsing Websites Privately</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Enter the URL you wish to visit in the search box and click "Browse". The website will load through our secure proxy.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">Privacy Features</h4>
                    <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                      <li>Your IP address is hidden from websites you visit</li>
                      <li>No browsing history is stored on your device</li>
                      <li>Trackers can be blocked for enhanced privacy</li>
                      <li>Ads can be removed for a cleaner browsing experience</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-200">Limitations</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Some websites with advanced security measures may detect proxy usage and limit functionality.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
