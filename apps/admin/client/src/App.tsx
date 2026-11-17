import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider, Card, Badge, Button } from '@carepal/ui';
import { AdminLayout } from './components/AdminLayout.js';
import { Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

function DashboardOverview() {
  const stageStats = [
    { label: 'Applied', stage: 'APPLIED' as const, count: 8 },
    { label: 'Screening', stage: 'SCREENING' as const, count: 8 },
    { label: 'Interview', stage: 'INTERVIEW' as const, count: 8 },
    { label: 'Verified', stage: 'VERIFIED' as const, count: 6 },
    { label: 'Onboarded', stage: 'ONBOARDED' as const, count: 6 },
    { label: 'Rejected', stage: 'REJECTED' as const, count: 4 },
  ];

  return (
    <div className="space-y-8">
      {/* Title & Quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-brand-heading">
            Operations Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time candidate tracking across India care centers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
          <Button variant="primary" size="sm">
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" variant="white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Candidates</span>
            <Users className="w-4 h-4 text-brand-action" />
          </div>
          <div className="text-2xl font-bold font-heading text-brand-heading mt-2">42</div>
          <div className="text-[11px] text-green-600 font-medium mt-1">
            Across 8 target cities
          </div>
        </Card>

        <Card padding="sm" variant="white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">New Today</span>
            <Clock className="w-4 h-4 text-brand-deepBlue" />
          </div>
          <div className="text-2xl font-bold font-heading text-brand-heading mt-2">8</div>
          <div className="text-[11px] text-gray-400 mt-1">
            Pending initial review
          </div>
        </Card>

        <Card padding="sm" variant="white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Verified Staff</span>
            <CheckCircle2 className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl font-bold font-heading text-brand-heading mt-2">12</div>
          <div className="text-[11px] text-teal-700 font-medium mt-1">
            Ready for shifts
          </div>
        </Card>

        <Card padding="sm" variant="white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Attention Needed</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-brand-heading mt-2">3</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Waiting &gt; 3 days in stage
          </div>
        </Card>
      </div>

      {/* Pipeline Stage Counts Bar */}
      <Card padding="md" variant="white">
        <h3 className="text-sm font-heading font-semibold text-brand-heading mb-4">
          Pipeline Distribution by Stage
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stageStats.map((item) => (
            <div
              key={item.stage}
              className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100 flex flex-col justify-between"
            >
              <Badge label={item.label} stage={item.stage} size="sm" />
              <div className="text-xl font-bold font-heading text-brand-heading mt-3">
                {item.count}
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5">Candidates</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AdminLayout>
          <Routes>
            <Route path="*" element={<DashboardOverview />} />
          </Routes>
        </AdminLayout>
      </ToastProvider>
    </BrowserRouter>
  );
}
