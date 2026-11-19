import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@carepal/ui';
import { AdminLayout } from './components/AdminLayout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { AuthProvider } from './context/AuthContext.js';
import { LoginPage } from './features/auth/LoginPage.js';
import { CandidateListPage } from './features/candidates/CandidateListPage.js';
import { PipelineBoardPage } from './features/board/PipelineBoardPage.js';
import { VerificationPage } from './features/verification/VerificationPage.js';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Routes>
                      <Route path="/" element={<PipelineBoardPage />} />
                      <Route path="/candidates" element={<CandidateListPage />} />
                      <Route path="/candidates/:id" element={<CandidateListPage />} />
                      <Route path="/checklist" element={<VerificationPage />} />
                      <Route path="/verification" element={<VerificationPage />} />
                      <Route path="*" element={<PipelineBoardPage />} />
                    </Routes>
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
