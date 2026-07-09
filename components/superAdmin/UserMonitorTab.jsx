"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, LogOut, Wifi, WifiOff, Clock, MapPin } from 'lucide-react';
import api from '@/lib/client/apiClient';
import OtpModal from './OtpModal';

const ROLE_COLORS = {
  Admin:      { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  Supervisor: { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  Accountant: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  User:       { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  Operator:   { bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500' },
};

// Maps API paths to human-readable activity descriptions
const ACTIVITY_MAP = [
  // Dashboard
  { re: /GET.*\/api\/dashboard/,           label: 'Viewing Dashboard',        dot: 'bg-indigo-400' },
  // Orders
  { re: /GET.*\/api\/orders/,              label: 'Viewing Orders',           dot: 'bg-sky-400' },
  { re: /POST.*\/api\/orders/,             label: 'Creating New Order',       dot: 'bg-green-400' },
  { re: /PUT.*\/api\/orders/,              label: 'Editing Order',            dot: 'bg-amber-400' },
  { re: /DELETE.*\/api\/orders/,           label: 'Deleting Order',           dot: 'bg-red-400' },
  // Dispatch
  { re: /GET.*\/api\/dispatches/,          label: 'Viewing Dispatches',       dot: 'bg-sky-400' },
  { re: /POST.*\/api\/dispatches/,         label: 'Creating Dispatch',        dot: 'bg-green-400' },
  { re: /PUT.*\/api\/dispatches/,          label: 'Updating Dispatch',        dot: 'bg-amber-400' },
  { re: /GET.*\/Inventory\/Dispatch/,      label: 'Viewing Dispatch',         dot: 'bg-sky-400' },
  { re: /POST.*\/Inventory\/Dispatch/,     label: 'Creating Dispatch',        dot: 'bg-green-400' },
  { re: /PUT.*\/Inventory\/Dispatch/,      label: 'Updating Dispatch',        dot: 'bg-amber-400' },
  // Models / Serials
  { re: /GET.*\/api\/models/,              label: 'Viewing Models',           dot: 'bg-sky-400' },
  { re: /POST.*\/api\/models/,             label: 'Adding Model',             dot: 'bg-green-400' },
  { re: /PUT.*\/api\/models/,              label: 'Editing Model',            dot: 'bg-amber-400' },
  { re: /GET.*\/api\/serials/,             label: 'Viewing Serials',          dot: 'bg-sky-400' },
  { re: /POST.*\/api\/serials/,            label: 'Adding Serial',            dot: 'bg-green-400' },
  { re: /PUT.*\/api\/serials/,             label: 'Editing Serial',           dot: 'bg-amber-400' },
  // Billing
  { re: /GET.*\/api\/billing/,             label: 'Viewing Billing',          dot: 'bg-sky-400' },
  { re: /PUT.*\/api\/billing/,             label: 'Processing Billing',       dot: 'bg-amber-400' },
  // Reports
  { re: /GET.*\/api\/reports/,             label: 'Viewing Reports',          dot: 'bg-sky-400' },
  { re: /GET.*\/api\/export/,              label: 'Exporting Data',           dot: 'bg-violet-400' },
  // Installations
  { re: /GET.*\/api\/installations/,       label: 'Viewing Installations',    dot: 'bg-sky-400' },
  { re: /POST.*\/api\/installations/,      label: 'Adding Installation',      dot: 'bg-green-400' },
  { re: /PUT.*\/api\/installations/,       label: 'Editing Installation',     dot: 'bg-amber-400' },
  // Returns / Damaged
  { re: /GET.*\/api\/returns/,             label: 'Viewing Returns',          dot: 'bg-sky-400' },
  { re: /POST.*\/api\/returns/,            label: 'Creating Return',          dot: 'bg-green-400' },
  { re: /GET.*\/Inventory\/Damaged/,       label: 'Viewing Damaged Stock',    dot: 'bg-sky-400' },
  { re: /POST.*\/Inventory\/Damaged/,      label: 'Adding Damaged Entry',     dot: 'bg-green-400' },
  // Stock
  { re: /GET.*\/Inventory\/StockIn/,       label: 'Viewing Stock In',         dot: 'bg-sky-400' },
  { re: /POST.*\/Inventory\/StockIn/,      label: 'Adding Stock In',          dot: 'bg-green-400' },
  { re: /GET.*\/Inventory\/StockOut/,      label: 'Viewing Stock Out',        dot: 'bg-sky-400' },
  { re: /POST.*\/Inventory\/StockOut/,     label: 'Adding Stock Out',         dot: 'bg-green-400' },
  // Godown / Masters
  { re: /GET.*\/api\/godowns/,             label: 'Viewing Godown Master',    dot: 'bg-sky-400' },
  { re: /POST.*\/api\/godowns/,            label: 'Adding Godown Entry',      dot: 'bg-green-400' },
  { re: /GET.*\/Inventory\/VendorMaster/,  label: 'Viewing Vendor Master',    dot: 'bg-sky-400' },
  // FBF / FBA
  { re: /GET.*\/api\/fbf-fba/,             label: 'Viewing FBF/FBA',          dot: 'bg-sky-400' },
  { re: /POST.*\/api\/fbf-fba/,            label: 'Creating FBF/FBA Entry',   dot: 'bg-green-400' },
  // Users
  { re: /GET.*\/api\/users/,               label: 'Viewing Users',            dot: 'bg-sky-400' },
  { re: /POST.*\/api\/users/,              label: 'Creating User',            dot: 'bg-green-400' },
  { re: /PUT.*\/api\/users/,               label: 'Editing User',             dot: 'bg-amber-400' },
  // Auth / Notifications (background noise — show as idle)
  { re: /GET.*\/api\/auth\/me/,            label: 'Idle',                     dot: 'bg-slate-300' },
  { re: /GET.*\/api\/notifications/,       label: 'Idle',                     dot: 'bg-slate-300' },
  { re: /GET.*\/api\/dropdown/,            label: 'Idle',                     dot: 'bg-slate-300' },
  { re: /GET.*\/health/,                   label: 'Idle',                     dot: 'bg-slate-300' },
];

function getActivity(lastPath) {
  if (!lastPath) return { label: 'Idle', dot: 'bg-slate-300' };
  const match = ACTIVITY_MAP.find(({ re }) => re.test(lastPath));
  if (match) return match;
  // Fallback: parse method + segment
  const [method, path = ''] = lastPath.split(' ');
  const segment = path.split('/').filter(Boolean).find(s => !/^[a-f0-9-]{8,}$/.test(s) && !/^\d+$/.test(s)) || 'App';
  const label = method === 'GET' ? `Viewing ${segment}` : method === 'POST' ? `Creating in ${segment}` : method === 'PUT' ? `Editing in ${segment}` : lastPath;
  return { label, dot: 'bg-slate-400' };
}

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const initials = (name) => (name || '?').split(/[\s_]/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

export default function UserMonitorTab() {
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [otpModal, setOtpModal]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/active-users');
      setSessions(Array.isArray(res.data) ? res.data : []);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const handleForceLogout = (s) => {
    setOtpModal({
      actionLabel: `Force logout "${s.username}" (${s.role})? Their session will be immediately invalidated.`,
      onConfirm: async (otp) => {
        await api.post(`/admin/force-logout/${s.userId}`, { otp });
        setSessions((prev) => prev.filter((x) => x.userId !== s.userId));
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {otpModal && (
        <OtpModal
          actionLabel={otpModal.actionLabel}
          onConfirm={otpModal.onConfirm}
          onClose={() => setOtpModal(null)}
        />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sessions.length > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {sessions.length > 0 ? <Wifi size={12} /> : <WifiOff size={12} />}
            {sessions.length} user{sessions.length !== 1 ? 's' : ''} online
          </div>
          {lastRefresh && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={11} /> Updated {timeAgo(lastRefresh)}
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Empty state */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
          <WifiOff size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium text-sm">No active users in the last 30 minutes</p>
          <p className="text-slate-400 text-xs mt-1">Users appear here as soon as they make any request</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => {
            const role  = ROLE_COLORS[s.role] || ROLE_COLORS.User;
            const activity = getActivity(s.lastPath);
            const isIdle = activity.label === 'Idle';

            return (
              <div
                key={s.userId}
                className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                {/* Avatar */}
                <div className={`relative w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${role.bg} ${role.text}`}>
                  {initials(s.username)}
                  {/* Online dot */}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isIdle ? 'bg-slate-300' : 'bg-green-500'}`} />
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{s.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.bg} ${role.text}`}>
                      {s.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 font-mono truncate">{s.ip}</p>
                    <span className="text-slate-300">·</span>
                    <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                      <MapPin size={10} className="shrink-0" />
                      {s.location || 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Activity */}
                <div className="shrink-0 text-right hidden sm:block">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    <span className={`w-2 h-2 rounded-full ${activity.dot} ${!isIdle ? 'animate-pulse' : ''}`} />
                    <span className={`text-sm font-medium ${isIdle ? 'text-slate-400' : 'text-slate-700'}`}>
                      {activity.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{timeAgo(s.lastActivity)}</p>
                </div>

                {/* Activity (mobile) */}
                <div className="shrink-0 sm:hidden text-right">
                  <span className={`w-2 h-2 rounded-full inline-block ${activity.dot}`} />
                </div>

                {/* Force logout */}
                <button
                  onClick={() => handleForceLogout(s)}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 hover:border-red-400 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400">Auto-refreshes every 30 seconds · Shows users active in last 30 minutes</p>
    </div>
  );
}


