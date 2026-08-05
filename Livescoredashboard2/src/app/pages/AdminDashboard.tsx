import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, getEdgeFunctionUrl, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { Shield, Mail, CreditCard, Activity, Users, TrendingUp, AlertCircle, CheckCircle, Clock, Ban, UserCheck, RotateCcw, Archive, MessageSquare, Star, Loader2 } from 'lucide-react';
import Header from '@/app/components/sports/Header';
import Footer from '@/app/components/sports/Footer';
import SEO from '@/app/components/SEO';
import type { Sport } from '@/app/data/sportsData';
import { useAuth } from '@/app/context/AuthContext';

type AdminTab = 'overview' | 'contacts' | 'payments' | 'activity' | 'favorites' | 'users';

interface AdminActionResponse {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

const AdminDashboard: React.FC = () => {
  const [activeSport, setActiveSport] = useState<Sport>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { user } = useAuth();

  const ownProfileQuery = useQuery({
    queryKey: ['own-profile-admin'],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('user_profiles').select('is_admin').eq('user_id', user.id).maybeSingle();
      return data || null;
    },
    enabled: !!user?.id,
  });

  // Admin gate: real is_admin flag + email fallback; in dev mode allow all authenticated
  const isAdmin = (import.meta.env?.DEV === true) ||
    ownProfileQuery.data?.is_admin === true ||
    user?.email?.includes('admin') === true ||
    user?.email === 'steve@scorehub.com';

  const runAdminAction = async (action: string, payload: Record<string, unknown>): Promise<AdminActionResponse> => {
    const session = await supabase.auth.getSession();
    const res = await fetch(getEdgeFunctionUrl('admin-action'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Action failed (${res.status})`);
    return data;
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleContactAction = async (contactId: string, status: 'read' | 'replied' | 'archived') => {
    setBusy(`contact-${contactId}`);
    try {
      let adminNotes: string | undefined;
      if (status === 'replied') {
        adminNotes = window.prompt('Admin note (visible to team):') || undefined;
      }
      await runAdminAction('contact_set_status', { contact_id: contactId, status, admin_notes: adminNotes });
      await contactsQuery.refetch();
      showToast('success', `Contact marked as ${status}`);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!window.confirm('Refund this payment? The user plan will be downgraded to free if this was their active premium.')) return;
    setBusy(`pay-${paymentId}`);
    try {
      await runAdminAction('payment_refund', { payment_id: paymentId });
      await paymentsQuery.refetch();
      showToast('success', 'Payment refunded');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setBusy(null);
    }
  };

  const handleUserStatus = async (userId: string, status: 'active' | 'suspended') => {
    setBusy(`user-${userId}`);
    try {
      await runAdminAction('user_set_status', { user_id: userId, status });
      await usersQuery.refetch();
      showToast('success', `User ${status === 'suspended' ? 'suspended' : 'activated'}`);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const handleAdminToggle = async (userId: string, isAdminFlag: boolean) => {
    setBusy(`admin-${userId}`);
    try {
      await runAdminAction('user_set_admin', { user_id: userId, is_admin: isAdminFlag });
      await usersQuery.refetch();
      showToast('success', isAdminFlag ? 'Admin role granted' : 'Admin role removed');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const contactsQuery = useQuery({
    queryKey: ['admin-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(50);
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const paymentsQuery = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const activityQuery = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_activity').select('*').order('created_at', { ascending: false }).limit(100);
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const favoritesQuery = useQuery({
    queryKey: ['admin-favorites-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_favorites_summary').select('*').limit(50);
      if (error && error.code !== '42P01') {
        const { data: favData } = await supabase.from('favorites').select('sport, league, team_name').limit(100);
        return { summary: [], raw: favData || [] };
      }
      return { summary: data || [], raw: [] };
    },
    enabled: isAdmin,
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false }).limit(50);
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-gray-400">Please sign in to access admin dashboard</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white">
        <Header activeSport={activeSport} onSportChange={setActiveSport} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">You don't have admin permissions</p>
        </div>
        <Footer />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-500/20 text-amber-400',
      read: 'bg-blue-500/20 text-blue-400',
      replied: 'bg-green-500/20 text-green-400',
      archived: 'bg-gray-500/20 text-gray-400',
      success: 'bg-green-500/20 text-green-400',
      failed: 'bg-red-500/20 text-red-400',
      refunded: 'bg-purple-500/20 text-purple-400',
      active: 'bg-green-500/20 text-green-400',
      suspended: 'bg-red-500/20 text-red-400',
    };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <SEO pageKey="admin" title="Admin Dashboard - ScoreHub" noindex />
      <Header activeSport={activeSport} onSportChange={setActiveSport} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Phase 5.7 - Manage contacts, payments & users</p>
          </div>
        </div>

        {toast && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${toast.type === 'success' ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
            {toast.message}
          </div>
        )}

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'contacts', label: 'Contacts', icon: Mail },
            { key: 'payments', label: 'Payments', icon: CreditCard },
            { key: 'users', label: 'Users', icon: Users },
            { key: 'activity', label: 'Activity', icon: Activity },
            { key: 'favorites', label: 'Favorites', icon: Star },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setAdminTab(tab.key as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${adminTab === tab.key ? 'bg-[#00d4ff] text-[#0d1117]' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {adminTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2"><Mail className="w-5 h-5 text-[#00d4ff]" /><h3 className="font-semibold">Contact Messages</h3></div>
              <p className="text-3xl font-bold text-white">{contactsQuery.data?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total inquiries</p>
            </div>
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2"><CreditCard className="w-5 h-5 text-emerald-400" /><h3 className="font-semibold">Payments</h3></div>
              <p className="text-3xl font-bold text-white">{paymentsQuery.data?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total transactions</p>
            </div>
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2"><Users className="w-5 h-5 text-amber-400" /><h3 className="font-semibold">Users</h3></div>
              <p className="text-3xl font-bold text-white">{usersQuery.data?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Registered profiles</p>
            </div>
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2"><Activity className="w-5 h-5 text-violet-400" /><h3 className="font-semibold">Activities</h3></div>
              <p className="text-3xl font-bold text-white">{activityQuery.data?.length || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Tracked events</p>
            </div>
            <div className="col-span-4 bg-gradient-to-r from-[#00d4ff]/10 to-[#0066ff]/10 border border-[#00d4ff]/20 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-3">Phase 5.7 Admin Actions Live</h3>
              <ul className="grid md:grid-cols-2 gap-2 text-sm text-gray-400">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Mark contacts read / replied with admin notes</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Refund payments (auto-downgrade premium)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Suspend / activate users</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Grant / revoke admin roles</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Web Push background delivery (VAPID)</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> RLS admin policies via is_admin() helper</li>
              </ul>
            </div>
          </div>
        )}

        {adminTab === 'contacts' && (
          <div className="bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="font-semibold">Contact Messages ({contactsQuery.data?.length || 0})</h3></div>
            <div className="divide-y divide-white/5">
              {(contactsQuery.data as any[])?.map((msg: any) => (
                <div key={msg.id} className="p-4 hover:bg-white/5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{msg.name}</span>
                        <span className="text-xs text-gray-500">{msg.email}</span>
                        {statusBadge(msg.status)}
                      </div>
                      <p className="text-sm text-gray-400 mt-1"><span className="font-medium text-white">{msg.subject}:</span> {msg.message.slice(0, 200)}</p>
                      {msg.admin_notes && <p className="text-xs text-amber-300 mt-1">📝 Admin note: {msg.admin_notes}</p>}
                      <p className="text-[11px] text-gray-600 mt-2">{new Date(msg.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {msg.status !== 'read' && (
                        <button onClick={() => handleContactAction(msg.id, 'read')} disabled={busy === `contact-${msg.id}`}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 disabled:opacity-50">
                          {busy === `contact-${msg.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Mark read
                        </button>
                      )}
                      {msg.status !== 'replied' && (
                        <button onClick={() => handleContactAction(msg.id, 'replied')} disabled={busy === `contact-${msg.id}`}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50">
                          {busy === `contact-${msg.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />} Mark replied
                        </button>
                      )}
                      {msg.status !== 'archived' && (
                        <button onClick={() => handleContactAction(msg.id, 'archived')} disabled={busy === `contact-${msg.id}`}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-500/15 text-gray-400 hover:bg-gray-500/25 disabled:opacity-50">
                          {busy === `contact-${msg.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />} Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!contactsQuery.data || contactsQuery.data.length === 0) && <p className="p-8 text-center text-gray-500">No contact messages yet. Run Phase 3 migration.</p>}
            </div>
          </div>
        )}

        {adminTab === 'payments' && (
          <div className="bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="font-semibold">Payment Logs ({paymentsQuery.data?.length || 0})</h3></div>
            <div className="divide-y divide-white/5">
              {(paymentsQuery.data as any[])?.slice(0, 30).map((pay: any) => (
                <div key={pay.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white font-mono">{pay.reference}</p>
                    <p className="text-xs text-gray-500">{pay.user_id?.slice(0, 8)} · {pay.amount} {pay.currency} · {pay.plan}</p>
                    <p className="text-[10px] text-gray-600 mt-1">{new Date(pay.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {statusBadge(pay.status)}
                    {(pay.status === 'success' || pay.status === 'pending') && (
                      <button onClick={() => handleRefund(pay.id)} disabled={busy === `pay-${pay.id}`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 disabled:opacity-50">
                        {busy === `pay-${pay.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Refund
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!paymentsQuery.data || paymentsQuery.data.length === 0) && <p className="p-8 text-center text-gray-500">No payments yet.</p>}
            </div>
          </div>
        )}

        {adminTab === 'users' && (
          <div className="bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="font-semibold">Users ({usersQuery.data?.length || 0})</h3></div>
            <div className="divide-y divide-white/5">
              {(usersQuery.data as any[])?.map((u: any) => (
                <div key={u.user_id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {((u.first_name?.[0] || u.email?.[0] || 'U')).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate flex items-center gap-2">
                        {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email}
                        {u.is_admin && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Admin</span>}
                        {statusBadge(u.account_status || 'active')}
                      </p>
                      <p className="text-gray-500 text-xs truncate">{u.email} · {u.country || '—'} · joined {new Date(u.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleAdminToggle(u.user_id, !u.is_admin)} disabled={busy === `admin-${u.user_id}`}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50">
                      {busy === `admin-${u.user_id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                      {u.is_admin ? 'Revoke admin' : 'Make admin'}
                    </button>
                    {u.account_status === 'suspended' ? (
                      <button onClick={() => handleUserStatus(u.user_id, 'active')} disabled={busy === `user-${u.user_id}`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50">
                        {busy === `user-${u.user_id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />} Activate
                      </button>
                    ) : (
                      <button onClick={() => handleUserStatus(u.user_id, 'suspended')} disabled={busy === `user-${u.user_id}` || u.user_id === user.id}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50">
                        {busy === `user-${u.user_id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />} Suspend
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!usersQuery.data || usersQuery.data.length === 0) && <p className="p-8 text-center text-gray-500">No user profiles yet.</p>}
            </div>
          </div>
        )}

        {adminTab === 'activity' && (
          <div className="bg-[#161b22] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5"><h3 className="font-semibold">User Activity ({activityQuery.data?.length || 0})</h3></div>
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {(activityQuery.data as any[])?.slice(0, 50).map((act: any) => (
                <div key={act.id} className="p-3 flex items-center gap-3 text-sm">
                  <Clock className="w-3 h-3 text-gray-600" />
                  <span className="font-mono text-xs text-[#00d4ff]">{act.action}</span>
                  <span className="text-gray-500 text-xs truncate flex-1">{JSON.stringify(act.metadata || {}).slice(0, 100)}</span>
                  <span className="text-gray-600 text-[10px]">{new Date(act.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'favorites' && (
          <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Favorites Analytics</h3>
            {Array.isArray((favoritesQuery.data as any)?.raw) && (favoritesQuery.data as any).raw.length > 0 ? (
              <div className="space-y-2">
                {(favoritesQuery.data as any).raw.slice(0, 20).map((fav: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm"><span>{fav.team_name || fav.league}</span><span className="text-gray-500">{fav.sport}</span></div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No favorites data yet or view not created. Check Phase 3 migration.</p>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
