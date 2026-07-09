"use client";
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShoppingCart, Truck, Users, Wrench, RotateCcw, FileText, Activity, Wifi } from 'lucide-react';
import api from '@/lib/client/apiClient';

const ROLE_COLORS = {
  Admin:      'bg-purple-100 text-purple-700',
  Supervisor: 'bg-blue-100 text-blue-700',
  Accountant: 'bg-amber-100 text-amber-700',
  User:       'bg-slate-100 text-slate-600',
  Operator:   'bg-emerald-100 text-emerald-700',
  SuperAdmin: 'bg-rose-100 text-rose-700',
};

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent" />
  </div>
);

const StatCard = ({ icon: Icon, label, value, sub, color = 'indigo' }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    blue:   'bg-blue-50 text-blue-600',
    rose:   'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    slate:  'bg-slate-50 text-slate-500',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-slate-800 mb-0.5">
        {value === null ? '—' : value.toLocaleString()}
      </div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
};

export default function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/analytics');
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (!data) return null;

  const { totals, activeSessions, recentActivity } = data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">System Overview</h2>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 px-3 py-1.5 rounded-lg">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={ShoppingCart} label="Total Orders"      value={totals.orders}     sub={`${totals.ordersMonth ?? 0} this month`} color="indigo" />
        <StatCard icon={Truck}        label="Total Dispatches"  value={totals.dispatches} color="blue" />
        <StatCard icon={Users}        label="Team Members"      value={totals.users}       sub={`${totals.admins ?? 0} admin${totals.admins !== 1 ? 's' : ''}`} color="violet" />
        <StatCard icon={Wifi}         label="Online Now"        value={activeSessions}     sub="active in last 30 min" color="green" />
        <StatCard icon={Wrench}       label="Installations"     value={totals.installs}   color="amber" />
        <StatCard icon={RotateCcw}    label="Returns"           value={totals.returns}    color="rose" />
        <StatCard icon={FileText}     label="Activity Logs"     value={totals.logs}       color="slate" />
      </div>

      {recentActivity?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <Activity size={15} className="text-indigo-600" />
            <span className="text-sm font-semibold text-slate-700">Recent Activity</span>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity.map((log, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[log.role] || 'bg-slate-100 text-slate-600'}`}>
                  {log.role}
                </span>
                <span className="text-sm font-medium text-slate-700 min-w-[100px]">{log.username}</span>
                <span className="text-sm text-slate-500 flex-1">{log.action}</span>
                <span className="text-xs text-slate-400 shrink-0">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


