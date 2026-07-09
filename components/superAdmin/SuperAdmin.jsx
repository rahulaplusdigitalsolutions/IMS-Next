"use client";
import { useState } from 'react';
import { Activity, FolderOpen, Database, Shield, Users, BarChart2, Bell, AlertTriangle } from 'lucide-react';
import HealthTab from './HealthTab';
import FileManagerTab from './FileManagerTab';
import DbExplorerTab from './DbExplorerTab';
import UserMonitorTab from './UserMonitorTab';
import AnalyticsTab from './AnalyticsTab';
import NotificationsAdminTab from './NotificationsAdminTab';
import ErrorLogsTab from './ErrorLogsTab';

const TABS = [
  { id: 'analytics',      label: 'Analytics',     icon: BarChart2 },
  { id: 'health',         label: 'Server Health',  icon: Activity },
  { id: 'users',          label: 'User Monitor',   icon: Users },
  { id: 'notifications',  label: 'Notifications',  icon: Bell },
  { id: 'errorLogs',      label: 'Error Logs',     icon: AlertTriangle },
  { id: 'files',          label: 'File Manager',   icon: FolderOpen },
  { id: 'db',             label: 'DB Explorer',    icon: Database },
];

export default function SuperAdmin({ currentUser }) {
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
          <Shield size={18} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Super Admin Panel</h1>
          <p className="text-sm text-slate-400">Analytics, monitoring, server &amp; database</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
        ⚠️ DB changes are permanent and cannot be undone. Edit/delete with caution.
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit min-w-full sm:min-w-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analytics'     && <AnalyticsTab />}
      {activeTab === 'health'        && <HealthTab />}
      {activeTab === 'users'         && <UserMonitorTab />}
      {activeTab === 'notifications' && <NotificationsAdminTab currentUser={currentUser} />}
      {activeTab === 'errorLogs'     && <ErrorLogsTab />}
      {activeTab === 'files'         && <FileManagerTab />}
      {activeTab === 'db'            && <DbExplorerTab />}
    </div>
  );
}

