import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import GraphPage from './pages/GraphPage';
import ImportPage from './pages/ImportPage';
import SearchPage from './pages/SearchPage';
import ExportPage from './pages/ExportPage';
import TemplatesPage from './pages/TemplatesPage';
import SupportPage from './pages/SupportPage';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './hooks/useAuth';
import { useMemoryStore } from './store/memoryStore';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center px-6">
      <div className="text-6xl mb-4">🧠</div>
      <h2 className="text-2xl font-bold text-white mb-2">Memory Not Found</h2>
      <p className="text-gray-400 mb-6">This page doesn't exist in our memory bank.</p>
      <a href="/" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
        Go to Dashboard
      </a>
    </div>
  );
}

export default function App() {
  useAuth();
  // Run auto-forget once on app boot to prune decayed memories.
  useEffect(() => {
    const removed = useMemoryStore.getState().runAutoForget();
    if (removed > 0) console.info(`[agentmemory] auto-forgot ${removed} decayed memories`);
  }, []);
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/graph" element={<GraphPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/pricing" element={<SupportPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </HashRouter>
  );
}
