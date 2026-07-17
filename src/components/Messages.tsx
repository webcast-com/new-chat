import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { Send, Search, Trash2, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
  recipient?: Profile;
}

interface MessagesProps {
  initialRecipientId?: string | null;
}

interface Conversation {
  userId: string;
  username: string;
  full_name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
}

export default function Messages({ initialRecipientId }: MessagesProps) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;

    loadConversations();

    const channel = supabase
      .channel(`messages:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const message = (payload.new || payload.old) as Partial<Message>;
          const isRelevant = message.sender_id === profile.id || message.recipient_id === profile.id;

          if (!isRelevant) return;

          loadConversations();

          if (
            selectedConversation &&
            (message.sender_id === selectedConversation || message.recipient_id === selectedConversation)
          ) {
            loadMessages(selectedConversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedConversation]);

  useEffect(() => {
    if (!profile || !initialRecipientId || initialRecipientId === profile.id) return;

    const openNewConversation = async () => {
      const { data: recipient, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', initialRecipientId)
        .maybeSingle();

      if (error) {
        console.error('Error loading message recipient:', error);
        return;
      }

      if (!recipient) return;

      setConversations((current) => {
        if (current.some((conversation) => conversation.userId === recipient.id)) return current;
        return [
          {
            userId: recipient.id,
            username: recipient.username,
            full_name: recipient.full_name,
            unreadCount: 0,
          },
          ...current,
        ];
      });
      setSelectedConversation(recipient.id);
    };

    openNewConversation();
  }, [initialRecipientId, profile]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!profile) return;

    try {
      const { data: sent } = await supabase
        .from('messages')
        .select('recipient_id, content, created_at, is_read, profiles!messages_recipient_id_fkey(*)')
        .eq('sender_id', profile.id)
        .order('created_at', { ascending: false });

      const { data: received } = await supabase
        .from('messages')
        .select('sender_id, content, created_at, is_read, profiles!messages_sender_id_fkey(*)')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false });

      const conversationMap = new Map<string, Conversation>();

      if (sent) {
        sent.forEach((msg: any) => {
          const key = msg.recipient_id;
          if (!conversationMap.has(key)) {
            const recipient = msg.profiles;
            conversationMap.set(key, {
              userId: key,
              username: recipient?.username || 'Unknown',
              full_name: recipient?.full_name || '',
              lastMessage: msg.content,
              lastMessageTime: msg.created_at,
              unreadCount: 0,
            });
          }
        });
      }

      if (received) {
        received.forEach((msg: any) => {
          const key = msg.sender_id;
          if (!conversationMap.has(key)) {
            const sender = msg.profiles;
            conversationMap.set(key, {
              userId: key,
              username: sender?.username || 'Unknown',
              full_name: sender?.full_name || '',
              lastMessage: msg.content,
              lastMessageTime: msg.created_at,
              unreadCount: msg.is_read ? 0 : 1,
            });
          } else {
            const conv = conversationMap.get(key)!;
            if (!msg.is_read) {
              conv.unreadCount += 1;
            }
            if (new Date(msg.created_at).getTime() > new Date(conv.lastMessageTime || 0).getTime()) {
              conv.lastMessage = msg.content;
              conv.lastMessageTime = msg.created_at;
            }
          }
        });
      }

      setConversations(Array.from(conversationMap.values()).sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || 0).getTime();
        const timeB = new Date(b.lastMessageTime || 0).getTime();
        return timeB - timeA;
      }));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles!messages_sender_id_fkey(*)')
        .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${profile.id})`)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);

        const unreadIds = data
          .filter((msg: Message) => msg.recipient_id === profile.id && !msg.is_read)
          .map((msg: Message) => msg.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase.from('messages').insert([
        {
          sender_id: profile.id,
          recipient_id: selectedConversation,
          content: newMessage.trim(),
        },
      ]);

      if (error) throw error;

      setNewMessage('');
      await loadMessages(selectedConversation);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', profile?.id);

      if (error) throw error;

      if (selectedConversation) {
        await loadMessages(selectedConversation);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleDeleteConversation = async (userId: string) => {
    if (!confirm('Delete this conversation?')) return;

    try {
      await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${profile?.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${profile?.id})`);

      setSelectedConversation(null);
      await loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = conversations.find(c => c.userId === selectedConversation);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 pb-24 md:grid-cols-3 md:gap-6 md:h-[calc(100dvh-150px)] md:pb-0">
      {/* Conversations List */}
      <div className="flex min-h-0 max-h-[45vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-1 md:max-h-none">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none text-sm"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-slate-400" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-slate-600">No conversations yet</p>
              <p className="text-sm text-slate-500 mt-1">Start a conversation with someone</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.userId}
                onClick={() => setSelectedConversation(conversation.userId)}
                className={`w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left ${
                  selectedConversation === conversation.userId ? 'bg-violet-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {conversation.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {conversation.full_name || conversation.username}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full flex-shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate">
                      {conversation.lastMessage || 'No messages'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {conversation.lastMessageTime ? formatTime(conversation.lastMessageTime) : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat View */}
      {selectedConversation && selectedUser ? (
        <div className="flex min-h-[60vh] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:min-h-0 md:col-span-2">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedUser.full_name || selectedUser.username}
                </h3>
                <p className="text-xs text-slate-500">@{selectedUser.username}</p>
              </div>
            </div>
            <button
              onClick={() => handleDeleteConversation(selectedConversation)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete conversation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isSent = message.sender_id === profile?.id;
                return (
                  <div key={message.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <div className="group relative max-w-xs">
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          isSent
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-br-none'
                            : 'bg-slate-100 text-slate-900 rounded-bl-none'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <p className={`text-xs mt-1 ${isSent ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                      {isSent && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="absolute -right-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-3 sm:p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none"
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-violet-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {sendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex min-h-[40vh] min-w-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm md:min-h-0 md:col-span-2">
          <div className="text-center">
            <p className="text-slate-600 text-lg">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
