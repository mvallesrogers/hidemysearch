export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} Hide My Search</span>
            <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600">Terms of Service</a>
          </div>
          <div className="mt-4 md:mt-0">
            <p className="text-sm text-slate-500 dark:text-slate-400">Made with ❤️ by Miggy the coder</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
