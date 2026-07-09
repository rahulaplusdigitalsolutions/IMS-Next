"use client";
import { useState } from 'react';
import { Bell, Mail, Send, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import api from '@/lib/client/apiClient';
import OtpModal from './OtpModal';

const ROLES = ['All', 'Admin', 'Supervisor', 'Accountant', 'User', 'Operator'];

const Toast = ({ type, msg }) => {
  if (!msg) return null;
  const styles = type === 'success'
    ? 'bg-green-50 border border-green-200 text-green-700'
    : 'bg-red-50 border border-red-200 text-red-700';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${styles}`}>
      <Icon size={15} /> {msg}
    </div>
  );
};

export default function NotificationsAdminTab({ currentUser }) {
  // Broadcast state
  const [bTitle, setBTitle] = useState('');
  const [bMsg, setBMsg] = useState('');
  const [bRole, setBRole] = useState('All');
  const [bPending, setBPending] = useState(null);
  const [bStatus, setBStatus] = useState(null);

  // Test email state
  const [eLoading, setELoading] = useState(false);
  const [eStatus, setEStatus] = useState(null);

  const handleBroadcastSubmit = (e) => {
    e.preventDefault();
    if (!bTitle.trim() || !bMsg.trim()) return;
    setBPending({ title: bTitle, message: bMsg, role: bRole });
  };

  const handleBroadcastConfirm = async (otp) => {
    await api.post('/admin/broadcast', {
      title: bPending.title,
      message: bPending.message,
      targetRole: bPending.role,
      otp,
    });
    setBStatus({ type: 'success', msg: `Notification sent to ${bPending.role === 'All' ? 'all users' : bPending.role + 's'}.` });
    setBTitle(''); setBMsg(''); setBRole('All');
    setBPending(null);
  };

  const handleTestEmail = async () => {
    setELoading(true);
    setEStatus(null);
    try {
      await api.post('/admin/test-email');
      setEStatus({ type: 'success', msg: 'Test email sent successfully. Check your inbox.' });
    } catch (err) {
      setEStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to send test email.' });
    } finally {
      setELoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {bPending && (
        <OtpModal
          actionLabel={`Broadcast "${bPending.title}" to ${bPending.role === 'All' ? 'everyone' : bPending.role + 's'}`}
          onConfirm={handleBroadcastConfirm}
          onClose={() => setBPending(null)}
        />
      )}

      {/* Broadcast Notification */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
          <Bell size={15} className="text-indigo-600" />
          <span className="text-sm font-semibold text-slate-700">Broadcast Notification</span>
        </div>
        <form onSubmit={handleBroadcastSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Notification Title</label>
              <input
                type="text"
                value={bTitle}
                onChange={e => setBTitle(e.target.value)}
                placeholder="e.g. System Maintenance"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Target Role</label>
              <div className="relative">
                <select
                  value={bRole}
                  onChange={e => setBRole(e.target.value)}
                  className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Message</label>
            <textarea
              value={bMsg}
              onChange={e => setBMsg(e.target.value)}
              rows={3}
              placeholder="Enter the notification message…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          {bStatus && <Toast type={bStatus.type} msg={bStatus.msg} />}
          <button
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Send size={14} /> Send Broadcast
          </button>
          <p className="text-xs text-slate-400">An OTP will be sent to your email to confirm this action.</p>
        </form>
      </div>

      {/* Test Email */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
          <Mail size={15} className="text-indigo-600" />
          <span className="text-sm font-semibold text-slate-700">SMTP Test Email</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">Verify that your SMTP email configuration is working by sending a test email to <span className="font-medium">{currentUser?.email || 'your registered email'}</span>.</p>
          {eStatus && <Toast type={eStatus.type} msg={eStatus.msg} />}
          <button
            onClick={handleTestEmail}
            disabled={eLoading}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            <Mail size={14} /> {eLoading ? 'Sending…' : 'Send Test Email'}
          </button>
        </div>
      </div>
    </div>
  );
}


