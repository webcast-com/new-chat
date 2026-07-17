import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import VideoCall from './VideoCall';
import { ArrowLeft, File, ImagePlus, Loader2, MessageCircle, Paperclip, Plus, Search, Send, Smile, Trash2, X, Video as VideoIcon } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
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
  const [attachment, setAttachment] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientCandidates, setRecipientCandidates] = useState<Profile[]>([]);
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const emojiOptions = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
      const details = error as { message?: string; error_description?: string; details?: string; hint?: string };
      return [details.message || details.error_description, details.details, details.hint].filter(Boolean).join(' — ') || 'Unknown Supabase error';
    }
    return String(error);
  };

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
      const [{ data: sent, error: sentError }, { data: received, error: receivedError }] = await Promise.all([
        supabase
          .from('messages')
          .select('recipient_id, content, created_at, is_read, profiles!messages_recipient_id_fkey(*)')
          .eq('sender_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('sender_id, content, created_at, is_read, profiles!messages_sender_id_fkey(*)')
          .eq('recipient_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);

      if (sentError) throw sentError;
      if (receivedError) throw receivedError;

      const conversationMap = new Map<string, Conversation>();

      if (sent) {
        sent.forEach((msg) => {
          const key = msg.recipient_id;
          if (!conversationMap.has(key)) {
            const recipient = msg.profiles[0];
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
        received.forEach((msg) => {
          const key = msg.sender_id;
          if (!conversationMap.has(key)) {
            const sender = msg.profiles[0];
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

  const loadRecipientCandidates = async () => {
    if (!profile) return;

    setLoadingRecipients(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile.id)
        .order('username')
        .limit(20);

      if (error) throw error;
      setRecipientCandidates(data || []);
    } catch (error) {
      console.error('Error loading message recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const openRecipientPicker = () => {
    setRecipientSearch('');
    setShowRecipientPicker(true);
    void loadRecipientCandidates();
  };

  const startConversation = (recipient: Profile) => {
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
    setShowRecipientPicker(false);
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
        const messagesWithSignedAttachments = await Promise.all(data.map(async (message: Message) => {
          if (!message.attachment_url) return message;
          const { data: signed } = await supabase.storage
            .from('message-attachments')
            .createSignedUrl(message.attachment_url, 3600);
          return { ...message, attachment_url: signed?.signedUrl || null };
        }));
        setMessages(messagesWithSignedAttachments);
        await loadReactions(data.map((message: Message) => message.id));

        const unreadIds = data
          .filter((msg: Message) => msg.recipient_id === profile.id && !msg.is_read)
          .map((msg: Message) => msg.id);

        if (unreadIds.length > 0) {
          const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds);

          if (error) throw error;
          await loadConversations();
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadReactions = async (messageIds: string[]) => {
    if (messageIds.length === 0) {
      setReactions({});
      return;
    }

    const { data, error } = await supabase
      .from('message_reactions')
      .select('message_id, reaction')
      .in('message_id', messageIds);

    if (error) {
      console.error('Error loading message reactions:', getErrorMessage(error));
      setReactions({});
      return;
    }

    const grouped: Record<string, Record<string, number>> = {};
    (data || []).forEach(({ message_id, reaction }) => {
      grouped[message_id] ??= {};
      grouped[message_id][reaction] = (grouped[message_id][reaction] || 0) + 1;
    });
    setReactions(grouped);
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('Attachments must be smaller than 25MB.');
      event.target.value = '';
      return;
    }
    setAttachment(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !profile || !selectedConversation) return;

    setSendingMessage(true);
    try {
      let attachmentUrl: string | null = null;
      if (attachment) {
        const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const path = `${profile.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(path, attachment);
        if (uploadError) throw uploadError;
        attachmentUrl = path;
      }

      const messagePayload = {
        sender_id: profile.id,
        recipient_id: selectedConversation,
        content: newMessage.trim(),
        ...(attachment ? {
          attachment_url: attachmentUrl,
          attachment_name: attachment.name,
          attachment_type: attachment.type,
        } : {}),
      };
      const { error } = await supabase.from('messages').insert(messagePayload);

      if (error) throw error;

      setNewMessage('');
      setAttachment(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      await loadMessages(selectedConversation);
      await loadConversations();
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Error sending message:', message);
      alert(message.includes('Bucket not found')
        ? 'Attachments are not configured yet. Apply the messaging migration in Supabase, then try again.'
        : `Failed to send message: ${message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleReaction = async (messageId: string, reaction: string) => {
    if (!profile) return;
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', profile.id)
      .eq('reaction', reaction)
      .maybeSingle();

    const result = existing
      ? await supabase.from('message_reactions').delete().eq('id', existing.id)
      : await supabase.from('message_reactions').insert({ message_id: messageId, user_id: profile.id, reaction });

    if (result.error) {
      console.error('Error updating message reaction:', getErrorMessage(result.error));
      return;
    }
    await loadReactions(messages.map((message) => message.id));
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
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${profile?.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${profile?.id})`);

      if (error) throw error;

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
  const filteredRecipients = recipientCandidates.filter((recipient) => {
    const query = recipientSearch.trim().toLowerCase();
    return !query || recipient.username.toLowerCase().includes(query) || recipient.full_name?.toLowerCase().includes(query);
  });

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 pb-24 md:grid-cols-3 md:gap-6 md:h-[calc(100dvh-150px)] md:pb-0">
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} min-h-0 max-h-[45vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-1 md:max-h-none`}>
        <div className="p-4 border-b border-slate-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">Messages</h2>
            <button
              type="button"
              onClick={openRecipientPicker}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>
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
              <MessageCircle className="mb-3 h-9 w-9 text-violet-300" />
              <p className="font-medium text-slate-700">No conversations yet</p>
              <p className="mt-1 text-sm text-slate-500">Start a private conversation with someone in the community.</p>
              <button
                type="button"
                onClick={openRecipientPicker}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                New message
              </button>
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
              <button
                type="button"
                onClick={() => setSelectedConversation(null)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 md:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowVideoCall(true)}
                className="rounded-lg p-2 text-violet-600 transition-colors hover:bg-violet-50"
                title="Start video call"
                aria-label="Start video call"
              >
                <VideoIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDeleteConversation(selectedConversation)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete conversation"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
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
                        {message.content && <p className="break-words whitespace-pre-wrap">{message.content}</p>}
                        {message.attachment_url && (
                          <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-lg bg-black/10 p-2 text-sm underline">
                            {message.attachment_type?.startsWith('image/') ? <ImagePlus className="h-4 w-4" /> : <File className="h-4 w-4" />}
                            <span className="max-w-48 truncate">{message.attachment_name || 'Attachment'}</span>
                          </a>
                        )}
                        <p className={`text-xs mt-1 ${isSent ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(reactions[message.id] || {}).map(([reaction, count]) => (
                          <button key={reaction} type="button" onClick={() => toggleReaction(message.id, reaction)} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs shadow-sm">
                            {reaction} {count}
                          </button>
                        ))}
                        <button type="button" onClick={() => toggleReaction(message.id, '👍')} className="rounded-full border border-slate-200 bg-white p-1 text-xs opacity-0 transition-opacity group-hover:opacity-100" aria-label="Add like reaction">👍</button>
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
            {attachment && <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700"><span className="truncate">{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} className="p-1" aria-label="Remove attachment"><X className="h-4 w-4" /></button></div>}
            <div className="flex gap-2">
              <input ref={attachmentInputRef} type="file" onChange={handleAttachmentChange} className="hidden" />
              <button type="button" onClick={() => attachmentInputRef.current?.click()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Attach a file"><Paperclip className="h-5 w-5" /></button>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 pr-10 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-violet-500"
                />
                <button type="button" onClick={() => setShowEmojiPicker((visible) => !visible)} className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Add emoji"><Smile className="h-5 w-5" /></button>
                {showEmojiPicker && <div className="absolute bottom-12 right-0 z-10 flex gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">{emojiOptions.map((emoji) => <button key={emoji} type="button" onClick={() => { setNewMessage((value) => value + emoji); setShowEmojiPicker(false); }} className="p-1 text-xl hover:bg-slate-100">{emoji}</button>)}</div>}
              </div>
              <button
                type="submit"
                disabled={sendingMessage || (!newMessage.trim() && !attachment)}
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
        <div className="flex min-h-[40vh] min-w-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:min-h-0 md:col-span-2">
          <div className="max-w-xs text-center">
            <MessageCircle className="mx-auto mb-3 h-10 w-10 text-violet-300" />
            <p className="text-lg font-semibold text-slate-800">Your messages</p>
            <p className="mt-1 text-sm text-slate-500">Choose an existing conversation or write to someone new.</p>
            <button
              type="button"
              onClick={openRecipientPicker}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              New message
            </button>
          </div>
        </div>
      )}

      {showVideoCall && selectedConversation && selectedUser && profile && (
        <VideoCall
          channelName={`video-call:${[profile.id, selectedConversation].sort().join(':')}`}
          userId={profile.id}
          remoteUserId={selectedConversation}
          remoteName={selectedUser.full_name || selectedUser.username}
          onClose={() => setShowVideoCall(false)}
          isOpen={showVideoCall}
        />
      )}

      {showRecipientPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(event) => event.target === event.currentTarget && setShowRecipientPicker(false)}>
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Start a new conversation">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">New message</h2>
                <p className="mt-1 text-sm text-slate-500">Choose someone to start a conversation.</p>
              </div>
              <button type="button" onClick={() => setShowRecipientPicker(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close new message dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <input
                autoFocus
                type="search"
                value={recipientSearch}
                onChange={(event) => setRecipientSearch(event.target.value)}
                placeholder="Search people..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto">
              {loadingRecipients ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
              ) : filteredRecipients.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No community members found.</p>
              ) : (
                filteredRecipients.map((recipient) => (
                  <button key={recipient.id} type="button" onClick={() => startConversation(recipient)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-violet-50">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white">{recipient.username.charAt(0).toUpperCase()}</span>
                    <span className="min-w-0"><span className="block truncate font-semibold text-slate-900">{recipient.full_name || recipient.username}</span><span className="block truncate text-sm text-slate-500">@{recipient.username}</span></span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
