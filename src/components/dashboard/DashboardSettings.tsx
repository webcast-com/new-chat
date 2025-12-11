import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Check, X, Loader2, Lock, Bell, Eye } from 'lucide-react';

export default function DashboardSettings() {
  const { profile, signOut } = useAuth();
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: true,
    messages: true,
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name,
        bio: profile.bio,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
    });
    setEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm font-medium">
          {message}
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Profile Information
        </h2>

        {!editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <p className="px-4 py-2 bg-slate-50 rounded-lg text-slate-900">{profile?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <p className="px-4 py-2 bg-slate-50 rounded-lg text-slate-900">{profile?.full_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <p className="px-4 py-2 bg-slate-50 rounded-lg text-slate-900 min-h-[60px]">
                {profile?.bio || 'No bio set'}
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all"
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                placeholder="Tell us about yourself"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all font-medium disabled:opacity-50"
              >
                <X className="w-4 h-4 inline mr-1" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </h2>

        <div className="space-y-4">
          {[
            { key: 'likes', label: 'Notify when someone likes my post' },
            { key: 'comments', label: 'Notify when someone comments' },
            { key: 'follows', label: 'Notify when someone follows me' },
            { key: 'messages', label: 'Notify when I receive messages' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <label className="text-slate-700 font-medium cursor-pointer">{item.label}</label>
              <button
                onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications[item.key as keyof typeof notifications]
                    ? 'bg-blue-500'
                    : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications[item.key as keyof typeof notifications]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Privacy & Security
        </h2>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="font-medium text-slate-900 mb-2">Change Password</p>
            <p className="text-sm text-slate-600 mb-3">Update your account password to keep your account secure</p>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all text-sm">
              Change Password
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="font-medium text-slate-900 mb-2">Account Status</p>
            <p className="text-sm text-slate-600 mb-3">Your account is currently active and secure</p>
            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Account Actions</h2>

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-all"
          >
            Sign Out
          </button>
          <button className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-all">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
