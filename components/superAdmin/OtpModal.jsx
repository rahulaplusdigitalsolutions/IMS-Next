"use client";
import { useState, useEffect, useRef } from 'react';
import { X, KeyRound, Mail, ShieldAlert } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '@/lib/client/apiClient';

// status: 'idle' | 'waiting' | 'approved' | 'rejected' | 'expired'
export default function OtpModal({ actionLabel, onConfirm, onClose }) {
  const [otp, setOtp]               = useState('');
  const [sending, setSending]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus]         = useState('idle');
  const [token, setToken]           = useState(null);
  const [error, setError]           = useState(null);
  const intervalRef                 = useRef(null);

  useEffect(() => {
    if (status !== 'waiting' || !token) return;
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/admin/check-approval?token=${token}`);
        const s = res.data.status;
        if (s === 'approved' || s === 'rejected' || s === 'expired') {
          if (s === 'approved' && res.data.otp) setOtp(res.data.otp);
          setStatus(s);
          clearInterval(intervalRef.current);
        }
      } catch { /* ignore transient errors */ }
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [status, token]);

  const sendOtp = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await api.post('/admin/request-otp', { action: actionLabel, pageUrl: window.location.href });
      if (res.data.notConfigured) {
        onClose();
        Swal.fire({ icon: 'error', title: 'Permission Denied', text: 'Email is not configured on this server. Action was blocked.', confirmButtonColor: '#7c3aed' });
        return;
      }
      setToken(res.data.approvalToken);
      setStatus('waiting');
    } catch (e) {
      setError('Failed to send: ' + (e.response?.data?.message || e.message));
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    setConfirming(true);
    setError(null);
    try {
      await onConfirm(otp);
      onClose();
    } catch (e) {
      onClose();
      Swal.fire({ icon: 'error', title: 'Permission Denied', text: e.response?.data?.message || 'Invalid or expired OTP.', confirmButtonColor: '#7c3aed' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <KeyRound size={17} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">OTP Verification</h3>
                <p className="text-violet-200 text-xs mt-0.5">Email approval required for this action</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">

          {status === 'idle' && (
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl px-4 py-3">
              An email will be sent to your <span className="font-semibold text-slate-700">registered email</span> with the action details and <strong>Approve / Reject</strong> buttons. Click Approve to receive your OTP.
            </p>
          )}

          {status === 'waiting' && (
            <div className="flex flex-col items-center gap-4 py-5">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Mail size={26} className="text-violet-500 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700 text-sm">Waiting for your approval…</p>
                <p className="text-xs text-slate-400 mt-1.5">Check your inbox and click <strong>Approve &amp; Get OTP</strong></p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                Checking every 3 seconds
              </div>
            </div>
          )}

          {status === 'approved' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium bg-emerald-50 rounded-xl px-4 py-3">
                <span className="text-base leading-none">✓</span>
                Approved! OTP has been filled in below.
              </div>
              <div className="relative">
                <input
                  type="text" inputMode="numeric" placeholder="0  0  0  0  0  0"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full border-2 border-slate-200 focus:border-violet-400 rounded-xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] outline-none transition-colors placeholder:text-slate-300 placeholder:tracking-[0.4em]"
                  maxLength={6} autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300 font-medium">{otp.length}/6</span>
              </div>
            </div>
          )}

          {status === 'rejected' && (
            <div className="flex flex-col items-center gap-3 py-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <ShieldAlert size={26} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-red-700 text-base">Access Denied</p>
                <p className="text-sm text-slate-500 mt-1">This action was rejected. No changes were made.</p>
              </div>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex flex-col items-center gap-3 py-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl leading-none">⏰</div>
              <div>
                <p className="font-bold text-amber-700 text-base">Request Expired</p>
                <p className="text-sm text-slate-500 mt-1">The approval link expired. Please try again.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              <span>✕</span> {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600 transition-colors">
              {status === 'rejected' || status === 'expired' ? 'Close' : 'Cancel'}
            </button>

            {status === 'idle' && (
              <button onClick={sendOtp} disabled={sending} className="flex-1 px-4 py-2.5 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-xl disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2">
                {sending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                  : <><Mail size={14} /> Send Approval Email</>}
              </button>
            )}

            {status === 'approved' && (
              <button onClick={confirm} disabled={confirming || otp.length !== 6} className="flex-1 px-4 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2">
                {confirming
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                  : 'Confirm & Execute'}
              </button>
            )}

            {status === 'expired' && (
              <button onClick={() => { setStatus('idle'); setToken(null); setOtp(''); }} className="flex-1 px-4 py-2.5 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors">
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


