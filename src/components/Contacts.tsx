import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { Loader2, MessageCircle } from 'lucide-react';
import Image from './Image';

interface ContactsProps {
  onStartMessage?: (userId: string) => void;
}

export default function Contacts({ onStartMessage }: ContactsProps) {
  const { user, profile } = useAuth();
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      loadContacts();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const loadContacts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('connections')
        .select('following_id, profiles:following_id(*)')
        .eq('follower_id', profile.id)
        .limit(8);

      if (error) throw error;

      const contactsData = data
        ?.map((conn: any) => conn.profiles)
        .filter(Boolean) || [];

      setContacts(contactsData);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
        <h2 className="font-bold text-slate-900 mb-4">Contacts</h2>
        <p className="text-slate-500 text-sm">Sign in to see your contacts</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24 space-y-3">
      <h2 className="font-bold text-slate-900">Contacts</h2>

      {contacts.length === 0 ? (
        <p className="text-slate-500 text-sm">No contacts yet. Follow people to see them here.</p>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 transition-all group">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden">
                  {contact.avatar_url ? (
                    <Image
                      src={contact.avatar_url}
                      alt={contact.username}
                      variant="avatar"
                    />
                  ) : (
                    <span>{contact.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {contact.username}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {contact.full_name || 'User'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onStartMessage?.(contact.id)}
                className="text-slate-400 hover:text-violet-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                title="Message"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
