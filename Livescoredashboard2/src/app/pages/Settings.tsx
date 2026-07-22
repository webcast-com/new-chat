import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import {
  User, Mail, Globe, FileText, Bell, Shield, Crown,
  Edit3, Save, X, Lock
} from 'lucide-react';

export function Settings() {
  const { user, updateProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    country: user?.country || '',
    bio: user?.bio || '',
  });
  const [notifs, setNotifs] = useState(user?.preferences || {
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    favorite_teams: [],
    favorite_leagues: [],
    dark_mode: false,
    language: 'en',
  });

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        ...form,
        preferences: {
          email_notifications: notifs.email_notifications,
          push_notifications: notifs.push_notifications,
          sms_notifications: notifs.sms_notifications,
        },
      });
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: user.name || '', country: user.country || '', bio: user.bio || '' });
    setNotifs(user.preferences || {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      favorite_teams: [],
      favorite_leagues: [],
      dark_mode: false,
      language: 'en',
    });
    setEditMode(false);
  };

  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and preferences.</p>
        </div>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Avatar & Plan */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                {initials}
              </div>
              <h2 className="text-lg font-bold text-white">{user.name}</h2>
              <p className="text-sm text-slate-400 mb-3">{user.email}</p>
              {user.plan === 'premium' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-400 text-sm font-medium rounded-full border border-amber-500/30">
                  <Crown className="w-3.5 h-3.5" /> Premium Member
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 text-slate-300 text-sm font-medium rounded-full">
                  Free Tier
                </span>
              )}
              {user.plan_expires_at && (
                <p className="text-xs text-slate-400 mt-3">
                  Premium until {format(new Date(user.plan_expires_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Info */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-400" /> Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-white font-medium">{user.name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <p className="text-slate-300 text-sm">{user.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Country</label>
                {editMode ? (
                  <input
                    type="text"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <p className="text-slate-300">{form.country || 'Not set'}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bio</label>
                {editMode ? (
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    rows={3}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <p className="text-slate-300 text-sm flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                    {form.bio || 'No bio set'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-blue-400" /> Notification Preferences
            </h3>
            <div className="space-y-4">
              {[
                { key: 'email_notifications' as const, label: 'Email Alerts', desc: 'Get updates sent to your email.' },
                { key: 'push_notifications' as const, label: 'Push Notifications', desc: 'Browser push notifications for alerts.' },
                { key: 'sms_notifications' as const, label: 'SMS Alerts', desc: 'Receive urgent updates via SMS.' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <button
                    disabled={!editMode}
                    onClick={() => editMode && setNotifs(n => ({ ...n, [item.key]: !n[item.key] }))}
                    className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${notifs[item.key] ? 'bg-blue-600' : 'bg-slate-600'} ${!editMode ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifs[item.key] ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-blue-400" /> Security
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-200">Password</p>
                  <p className="text-xs text-slate-400">Change your account password</p>
                </div>
                <button className="px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-400">Add extra security to your account</p>
                </div>
                <button className="px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
