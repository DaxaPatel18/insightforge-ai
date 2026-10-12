import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Sliders,
  Database,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Trash2,
  LogOut,
  ExternalLink,
  HardDrive,
  FileText,
  Files,
  Calendar,
  Mail,
  Briefcase,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
  getUserDataSummary,
  type UserDataSummary,
} from '../lib/api';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, updateUser, logout } = useAuth();

  // Active Tab: 'profile' | 'security' | 'appearance' | 'data'
  const activeTab = searchParams.get('tab') || 'profile';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Section A: Profile State
  const [fullName, setFullName] = useState<string>(user?.full_name || '');
  const [professionalRole, setProfessionalRole] = useState<string>(user?.professional_role || '');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync user state when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setProfessionalRole(user.professional_role || '');
    }
  }, [user]);

  // Section B: Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Section B: Account Deletion State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Section D: Data & Privacy State
  const [dataSummary, setDataSummary] = useState<UserDataSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'data') {
      fetchDataSummary();
    }
  }, [activeTab]);

  const fetchDataSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await getUserDataSummary();
      setDataSummary(res);
    } catch {
      // Non-critical telemetry fallback
    } finally {
      setLoadingSummary(false);
    }
  };

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setSavingProfile(true);

    try {
      const updated = await updateUserProfile({
        full_name: fullName.trim(),
        professional_role: professionalRole.trim(),
      });
      updateUser(updated);
      setProfileSuccess('Profile details successfully updated.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters in length.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Password successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password. Please verify current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Account Deletion Handler
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm account deletion.');
      return;
    }

    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteUserAccount(deletePassword);
      logout();
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Incorrect password.');
      setDeletingAccount(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formattedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Member';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account profile, authentication security, theme preferences, and data governance.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 sm:space-x-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Account & Security</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'appearance'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'data'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data & Privacy</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: MY PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Personal Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update your workspace identity. Changes are immediately reflected across executive summaries and navigation headers.
            </p>
          </div>

          {profileSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Alex Morgan"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Email Address (Read-Only Identity) */}
            <div>
              <label htmlFor="email_display" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email_display"
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Account email serves as your primary multi-tenant identifier.
              </p>
            </div>

            {/* Professional Role / Title */}
            <div>
              <label htmlFor="prof_role" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Professional Role / Title <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <input
                  id="prof_role"
                  type="text"
                  value={professionalRole}
                  onChange={(e) => setProfessionalRole(e.target.value)}
                  placeholder="e.g. Lead Data Scientist, Quantitative Researcher"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Custom title displayed in your workspace pill and executive dossiers.
              </p>
            </div>

            {/* Account Creation Date */}
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Member since: <strong className="text-slate-700 dark:text-slate-300">{formattedDate}</strong></span>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: ACCOUNT & SECURITY */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Password & Authentication Security
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update your account password with strong cryptographic hash compliance.
              </p>
            </div>

            {passwordSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4.5 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password <span className="text-slate-400 font-normal">(min 8 characters)</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Session Management */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Session
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Terminate the current authenticated session on this workstation.
              </p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-2 self-start sm:self-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-6 sm:p-8 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Permanently Delete Account
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1 max-w-2xl leading-relaxed">
                Irreversibly deletes your account credentials and cascades complete removal of all your owned datasets, machine learning experiments, knowledge documents, and compiled executive reports.
              </p>
            </div>

            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-md"
            >
              Delete My Workspace & Data
            </button>
          </div>

          {/* Confirmation Modal */}
          {deleteModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Confirm Account Deletion
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      This action cannot be undone. Enter your password to permanently delete your account and all associated assets.
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    {deleteError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Password
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter current password"
                    className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setDeletePassword('');
                      setDeleteError(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {deletingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Delete Forever</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: APPEARANCE */}
      {/* ========================================================================= */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Interface Appearance & Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize the look and feel of your InsightForge AI analytical workstation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            {/* Light Mode Card */}
            <button
              onClick={() => setTheme('light')}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between h-36 ${
                theme === 'light'
                  ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Light Theme
                </span>
                {theme === 'light' && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Crisp, high-contrast daylight mode with clear statistical boundaries.
              </p>
              <div className="w-full h-3 rounded-full bg-slate-200 border border-slate-300" />
            </button>

            {/* Dark Mode Card */}
            <button
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between h-36 ${
                theme === 'dark'
                  ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Dark Mode
                </span>
                {theme === 'dark' && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sleek dark palette engineered for low light and prolonged analysis sessions.
              </p>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-700" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: DATA & PRIVACY */}
      {/* ========================================================================= */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Workspace Data Metrics */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Workspace Data Governance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time telemetry and ownership metrics for your isolated tenant data assets.
                </p>
              </div>
              {loadingSummary && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Datasets</span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {dataSummary ? dataSummary.dataset_count : '—'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                  <Files className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Total Rows</span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {dataSummary ? dataSummary.total_rows.toLocaleString() : '—'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                  <span>Storage Used</span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {dataSummary ? formatBytes(dataSummary.total_storage_bytes) : '—'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>PDF Reports</span>
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {dataSummary ? dataSummary.report_count : '—'}
                </div>
              </div>
            </div>

            {/* Quick Management Links */}
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/datasets"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Manage Uploaded Datasets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/rag"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Manage Knowledge Documents</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Privacy & Legal Resources */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-card p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Data Privacy &amp; Subject Rights
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              InsightForge AI is an independently developed analytics platform operated by Daxa Antiya (Ahmedabad, India). All tabular data is processed within private workspace boundaries with zero unauthorized third-party telemetry.
            </p>

            <div className="flex flex-wrap gap-4 pt-2 text-xs">
              <Link to="/privacy" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Privacy Policy & Retention
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link to="/terms" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Terms of Service
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link to="/contact" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Submit Data Subject Request (DSAR)
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
