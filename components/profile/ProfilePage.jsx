"use client";
import React, { useState, useEffect } from 'react';
import { printerService } from '@/lib/services/api';
import { 
  User, KeyRound, Save, Loader2, AlertCircle, CheckCircle, 
  Mail, Phone, ShieldCheck, Lock, Eye, EyeOff 
} from 'lucide-react';

// Custom CSS for animations
const styleSheet = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; opacity: 0; }
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .delay-100 { animation-delay: 100ms; }
  .delay-200 { animation-delay: 200ms; }
`;

// Enhanced Toast notification component with smooth slide-in animation
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const baseClasses = "fixed top-5 right-5 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold z-50 flex items-center gap-3 animate-slide-in-right border backdrop-blur-sm";
  const typeClasses = {
    success: "bg-emerald-50/90 text-emerald-800 border-emerald-200/50 shadow-emerald-500/10",
    error: "bg-red-50/90 text-red-800 border-red-200/50 shadow-red-500/10",
  };
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <Icon size={20} className={type === 'success' ? 'text-emerald-600' : 'text-red-600'} />
      {message}
    </div>
  );
};

export default function ProfilePage({ currentUser }) {
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // UI State for Password Visibility
  const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await printerService.getProfile();
        setProfile({
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      } catch {
        setNotification({ type: 'error', message: 'Failed to load profile.' });
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setNotification(null);
    try {
      await printerService.updateProfile(profile);
      setNotification({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setNotification({ type: 'error', message: error.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotification({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setNotification({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    setSavingPassword(true);
    setNotification(null);
    try {
      await printerService.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setNotification({ type: 'success', message: 'Password changed successfully.' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPassword({ old: false, new: false, confirm: false }); // Reset visibility
    } catch (error) {
      setNotification({ type: 'error', message: error.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[500px] space-y-5">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="animate-spin text-indigo-600 relative z-10" size={48} />
        </div>
        <p className="text-slate-500 font-medium tracking-wide animate-pulse">Loading your profile...</p>
      </div>
    );
  }

  // Common input styling class for reuse
  const inputContainerStyles = "relative group mt-1.5";
  const inputStyles = "w-full pl-11 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all duration-300 outline-none sm:text-sm";
  const labelStyles = "text-sm font-semibold text-slate-700 ml-1";
  const iconStyles = "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-300";

  return (
    <>
      <style>{styleSheet}</style>
      {/* Changed to w-full to take the full width of the parent container */}
      <div className="w-full space-y-8 py-6 px-4 sm:px-6 lg:px-8">
        {notification && (
          <Toast 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
        
        {/* Profile Section */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden animate-fade-in-up">
          {/* Decorative floating blob */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-70 animate-float pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shadow-sm border border-indigo-100/50">
                  <User size={22} />
                </div>
                My Profile
              </h2>
              <p className="text-slate-500 text-sm ml-1">Update your personal information and contact details.</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyles}>Full Name</label>
                  <div className={inputContainerStyles}>
                    <User size={18} className={iconStyles} />
                    <input 
                      type="text" 
                      name="fullName" 
                      value={profile.fullName} 
                      onChange={handleProfileChange} 
                      className={inputStyles} 
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelStyles}>Username</label>
                  <div className={inputContainerStyles}>
                    <ShieldCheck size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={currentUser.username} 
                      disabled 
                      className={`${inputStyles} bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200/50 focus:ring-0 focus:border-slate-200`} 
                    />
                  </div>
                </div>
                <div>
                  <label className={labelStyles}>Email Address</label>
                  <div className={inputContainerStyles}>
                    <Mail size={18} className={iconStyles} />
                    <input 
                      type="email" 
                      name="email" 
                      value={profile.email} 
                      onChange={handleProfileChange} 
                      className={inputStyles} 
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelStyles}>Phone Number</label>
                  <div className={inputContainerStyles}>
                    <Phone size={18} className={iconStyles} />
                    <input 
                      type="tel" 
                      name="phone" 
                      value={profile.phone} 
                      onChange={handleProfileChange} 
                      className={inputStyles} 
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-5 mt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={savingProfile} 
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] hover:scale-[1.02] text-white rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none transition-all duration-200 shadow-lg shadow-indigo-600/20"
                >
                  {savingProfile ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving Changes...</>
                  ) : (
                    <><Save size={18} /> Save Profile</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden animate-fade-in-up delay-100">
          {/* Decorative floating blob */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-48 h-48 bg-rose-50 rounded-full blur-3xl opacity-70 animate-float delay-200 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 shadow-sm border border-rose-100/50">
                  <KeyRound size={22} />
                </div>
                Change Password
              </h2>
              <p className="text-slate-500 text-sm ml-1">Ensure your account is using a long, random password to stay secure.</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              {/* Old password is now in a grid layout to match the width nicely on full screen */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyles}>Old Password</label>
                  <div className={inputContainerStyles}>
                    <Lock size={18} className={iconStyles} />
                    <input 
                      type={showPassword.old ? "text" : "password"} 
                      name="oldPassword" 
                      value={passwordForm.oldPassword} 
                      onChange={handlePasswordChange} 
                      className={inputStyles} 
                      required 
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => togglePasswordVisibility('old')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword.old ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className={labelStyles}>New Password</label>
                  <div className={inputContainerStyles}>
                    <Lock size={18} className={iconStyles} />
                    <input 
                      type={showPassword.new ? "text" : "password"} 
                      name="newPassword" 
                      value={passwordForm.newPassword} 
                      onChange={handlePasswordChange} 
                      className={inputStyles} 
                      required 
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelStyles}>Confirm New Password</label>
                  <div className={inputContainerStyles}>
                    <Lock size={18} className={iconStyles} />
                    <input 
                      type={showPassword.confirm ? "text" : "password"} 
                      name="confirmPassword" 
                      value={passwordForm.confirmPassword} 
                      onChange={handlePasswordChange} 
                      className={inputStyles} 
                      required 
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-5 mt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={savingPassword} 
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-[0.97] hover:scale-[1.02] text-white rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none transition-all duration-200 shadow-lg shadow-slate-800/20"
                >
                  {savingPassword ? (
                    <><Loader2 size={18} className="animate-spin" /> Updating...</>
                  ) : (
                    <><Save size={18} /> Update Password</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
