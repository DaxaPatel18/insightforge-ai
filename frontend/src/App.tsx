import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Overview } from './pages/Overview';
import { DatasetStudio } from './pages/DatasetStudio';
import { AutoEDA } from './pages/AutoEDA';
import { MLLab } from './pages/MLLab';
import { AgentStudio } from './pages/AgentStudio';
import { KnowledgeRAG } from './pages/KnowledgeRAG';
import { Reports } from './pages/Reports';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { CookiePolicy } from './pages/CookiePolicy';
import { ContactPage } from './pages/ContactPage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication & Compliance Pages */}
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="privacy" element={<PrivacyPolicy />} />
            <Route path="terms" element={<TermsOfService />} />
            <Route path="cookies" element={<CookiePolicy />} />
            <Route path="contact" element={<ContactPage />} />

            {/* Authenticated Workspace Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Overview />} />
              <Route path="datasets" element={<DatasetStudio />} />
              <Route path="auto-eda" element={<AutoEDA />} />
              <Route path="ml-lab" element={<MLLab />} />
              <Route path="agents" element={<AgentStudio />} />
              <Route path="rag" element={<KnowledgeRAG />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback Redirection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
