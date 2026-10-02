import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import apiService from '../services/apiService';

const toDateValue = (value) => {
  if (!value) return new Date(0);
  if (value?.toDate) return value.toDate();
  return new Date(value);
};

const getConversationKey = (participants = []) => participants.slice().sort().join('__');

const toUnreadNumber = (unread, userId) => {
  if (typeof unread === 'number') return unread;
  if (unread && typeof unread === 'object' && userId) return unread[userId] || 0;
  return 0;
};

const resolveDisplayName = (data, fallback) => (
  data?.vendorProfile?.businessName ||
  data?.vendorProfile?.storeName ||
  data?.storeName ||
  data?.displayName ||
  data?.name ||
  data?.email?.split?.('@')?.[0] ||
  fallback
);

const MessageStatus = ({ status }) => {
  if (status === 'read') {
    return <span className="text-blue-300 text-xs ml-1" title="Read">✓✓</span>;
  }
  if (status === 'delivered') {
    return <span className="text-emerald-100 text-xs ml-1" title="Delivered">✓✓</span>;
  }
  return <span className="text-emerald-100 text-xs ml-1" title="Sent">✓</span>;
};

const Messages = () => {
  const { currentUser } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    markAsRead,
    unreadCount,
    loading,
    startConversation,
  } = useMessaging();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherParticipantName, setOtherParticipantName] = useState('');
  const [senderNames, setSenderNames] = useState({});
  const [conversationNames, setConversationNames] = useState({});
  const [mobileView, setMobileView] = useState('list');

  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  // Check for pending vendor message from sessionStorage after login
  useEffect(() => {
    if (!currentUser || !startConversation) return;
    if (activeConversation) return;

    try {
      const pendingMessage = sessionStorage.getItem('pendingVendorMessage');
      if (pendingMessage) {
        const { vendorId, timestamp } = JSON.parse(pendingMessage);
        if (Date.now() - timestamp < 300000) {
          sessionStorage.removeItem('pendingVendorMessage');
          const existingConv = conversations?.find(conv =>
            conv.participants?.includes(vendorId) && conv.participants?.includes(currentUser.uid)
          );
          if (existingConv) {
            setActiveConversation(existingConv);
            setMobileView('chat');
          } else {
            startConversation(vendorId).then((conv) => {
              setActiveConversation(conv);
              setMobileView('chat');
            }).catch((err) => {
              console.error('Failed to start conversation from Messages page:', err);
            });
          }
        } else {
          sessionStorage.removeItem('pendingVendorMessage');
        }
      }
    } catch (err) {
      console.error('Error checking pending vendor message in Messages:', err);
    }
  }, [currentUser, startConversation, conversations, activeConversation, setActiveConversation]);

  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation).catch(() => {});
    }
  }, [activeConversation, markAsRead]);

  // Stable scroll: only auto-scroll when new messages arrive, use 'auto' to avoid smooth twitch
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      requestAnimationFrame(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
      });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const conversationList = useMemo(() => (
    Array.isArray(conversations)
      ? conversations
      : Object.values(conversations || {})
  ), [conversations]);

  const uniqueConversations = useMemo(() => {
    const map = new Map();
    conversationList.forEach(conv => {
      const key = getConversationKey(conv.participants || []);
      const convTimestamp = toDateValue(conv.updatedAt || conv.lastMessage?.timestamp || conv.createdAt);
      const unread = toUnreadNumber(conv.unreadCount, currentUser?.uid);
      const relatedIds = new Set(conv.relatedConversationIds || []);
      if (!relatedIds.size && conv.id) relatedIds.add(conv.id);

      if (!map.has(key)) {
        map.set(key, {
          conversation: conv,
          timestamp: convTimestamp,
          unreadCount: unread,
          relatedConversationIds: new Set(relatedIds)
        });
      } else {
        const existing = map.get(key);
        existing.unreadCount += unread;
        relatedIds.forEach(id => existing.relatedConversationIds.add(id));
        if (convTimestamp > existing.timestamp) {
          existing.conversation = conv;
          existing.timestamp = convTimestamp;
        }
      }
    });

    return Array.from(map.values())
      .map(({ conversation, timestamp, unreadCount, relatedConversationIds }) => ({
        ...conversation,
        updatedAt: timestamp,
        unreadCount,
        relatedConversationIds: Array.from(relatedConversationIds)
      }))
      .sort((a, b) => toDateValue(b.updatedAt).getTime() - toDateValue(a.updatedAt).getTime());
  }, [conversationList, currentUser?.uid]);

  useEffect(() => {
    if (!activeConversation && uniqueConversations.length > 0) {
      setActiveConversation(uniqueConversations[0]);
    }
  }, [activeConversation, uniqueConversations, setActiveConversation]);

  // Fetch sender names — stable dependency on message sender IDs only
  const senderIdsKey = useMemo(() => {
    if (!messages || messages.length === 0) return '';
    return [...new Set(messages.map(msg => msg.senderId).filter(Boolean))].sort().join(',');
  }, [messages]);

  useEffect(() => {
    if (!senderIdsKey || !currentUser) return;
    const uniqueSenderIds = senderIdsKey.split(',').filter(Boolean);

    setSenderNames(prev => {
      const namesToFetch = uniqueSenderIds.filter(id => !prev[id]);
      if (namesToFetch.length === 0) return prev;

      (async () => {
        const namePromises = namesToFetch.map(async (senderId) => {
          try {
            const data = await apiService.auth.getProfile(senderId);
            return { senderId, displayName: resolveDisplayName(data, senderId) };
          } catch {
            return { senderId, displayName: senderId };
          }
        });
        const names = await Promise.all(namePromises);
        setSenderNames(current => {
          const updated = { ...current };
          names.forEach(({ senderId, displayName }) => {
            updated[senderId] = displayName;
          });
          return updated;
        });
      })();

      return prev;
    });
  }, [senderIdsKey, currentUser]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !activeConversation || sending) return;
    try {
      setSending(true);
      await sendMessage(activeConversation.id, text);
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const otherParticipantId = useMemo(() => {
    if (!activeConversation || !currentUser) return null;
    return (activeConversation.participants || []).find((p) => p !== currentUser.uid) || null;
  }, [activeConversation, currentUser]);

  useEffect(() => {
    const fetchName = async () => {
      if (!otherParticipantId) {
        setOtherParticipantName('');
        return;
      }
      try {
        const data = await apiService.auth.getProfile(otherParticipantId);
        setOtherParticipantName(data ? resolveDisplayName(data, otherParticipantId) : otherParticipantId);
      } catch {
        setOtherParticipantName(otherParticipantId || '');
      }
    };
    fetchName();
  }, [otherParticipantId]);

  // Fetch names for conversation list participants — stable dependency
  const conversationParticipantIdsKey = useMemo(() => {
    if (!currentUser || uniqueConversations.length === 0) return '';
    return uniqueConversations
      .map(conv => (conv.participants || []).find((p) => p !== currentUser.uid))
      .filter(Boolean)
      .sort()
      .join(',');
  }, [uniqueConversations, currentUser]);

  useEffect(() => {
    if (!conversationParticipantIdsKey) return;
    const otherParticipantIds = conversationParticipantIdsKey.split(',').filter(Boolean);

    setConversationNames(prev => {
      const idsToFetch = otherParticipantIds.filter(id => !prev[id]);
      if (idsToFetch.length === 0) return prev;

      (async () => {
        const fetches = idsToFetch.map(async (participantId) => {
          try {
            const data = await apiService.auth.getProfile(participantId);
            return { participantId, displayName: data ? resolveDisplayName(data, participantId) : participantId };
          } catch {
            return { participantId, displayName: participantId };
          }
        });
        const results = await Promise.all(fetches);
        setConversationNames(current => {
          const updated = { ...current };
          results.forEach(({ participantId, displayName }) => {
            updated[participantId] = displayName;
          });
          return updated;
        });
      })();

      return prev;
    });
  }, [conversationParticipantIdsKey]);

  const showConversationList = uniqueConversations.length > 1;
  const getOtherParticipantId = (conv) => (
    (conv.participants || []).find((p) => p !== currentUser?.uid) || null
  );

  const handleSelectConversation = useCallback((conv) => {
    setActiveConversation(conv);
    setMobileView('chat');
  }, [setActiveConversation]);

  const handleBackToList = useCallback(() => {
    setMobileView('list');
  }, []);

  // Memoize sorted messages to prevent re-sort on every render
  const sortedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return messages
      .slice()
      .sort((a, b) => {
        const aTime = toDateValue(a.timestamp).getTime();
        const bTime = toDateValue(b.timestamp).getTime();
        return aTime - bTime;
      });
  }, [messages]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 text-sm">Chat with vendors and buyers in real-time</p>
        </div>

        {/* Layout: on mobile show list OR chat, on desktop show both side by side */}
        <div className={`grid gap-4 lg:gap-6 ${showConversationList ? 'lg:grid lg:grid-cols-3' : 'lg:grid lg:grid-cols-1'}`}>
          {/* Conversations list — hidden on mobile when viewing chat */}
          {showConversationList && (
            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden lg:col-span-1 ${mobileView === 'chat' ? 'hidden lg:block' : 'block'}`}>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="font-semibold">Conversations</div>
                {unreadCount > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-[50vh] lg:max-h-[70vh] overflow-y-auto overscroll-contain">
                {loading && conversations.length === 0 && (
                  <div className="p-4 text-gray-500 text-sm">Loading conversations...</div>
                )}
                {conversations.length === 0 && !loading && (
                  <div className="p-6 text-center text-gray-500 text-sm">No conversations yet</div>
                )}
                <ul>
                  {uniqueConversations.map((conv) => {
                    const participantId = getOtherParticipantId(conv);
                    const participantName = participantId
                      ? (conversationNames[participantId] || 'Chat')
                      : 'Chat';
                    const unreadForUser = typeof conv.unreadCount === 'object'
                      ? conv.unreadCount[currentUser?.uid] || 0
                      : (conv.unreadCount || 0);
                    return (
                      <li key={conv.id}>
                        <button
                          onClick={() => handleSelectConversation(conv)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition ${activeConversation?.id === conv.id ? 'bg-gray-50' : ''}`}
                        >
                          <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">💬</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-gray-900 truncate min-w-0">
                                {participantName}
                              </div>
                              {conv.updatedAt && (
                                <div className="text-xs text-gray-500 shrink-0">
                                  {new Date(conv.updatedAt.toDate?.() || conv.updatedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {conv.lastMessage?.senderId === currentUser?.uid ? 'You: ' : ''}
                              <span className="text-sm text-gray-600">{conv.lastMessage?.content || 'Tap to start chatting'}</span>
                            </div>
                          </div>
                          {!!unreadForUser && (
                            <span className="ml-2 shrink-0 bg-emerald-600 text-white text-xs rounded-full h-5 min-w-[20px] px-2 flex items-center justify-center">
                              {unreadForUser}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Chat pane — hidden on mobile when viewing list */}
          <div className={`bg-white rounded-xl shadow-sm border flex flex-col h-[calc(100vh-200px)] lg:h-[calc(100vh-220px)] min-h-[400px] ${showConversationList ? 'lg:col-span-2' : 'lg:col-span-1'} ${showConversationList && mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
            {activeConversation ? (
              <>
                {/* Chat header with back button on mobile */}
                <div className="p-3 sm:p-4 border-b flex items-center gap-3 shrink-0">
                  {showConversationList && (
                    <button
                      onClick={handleBackToList}
                      className="lg:hidden shrink-0 p-1 -ml-1 text-gray-600 hover:text-gray-900"
                      aria-label="Back to conversations"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">👤</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 truncate">{otherParticipantName || 'Chat'}</div>
                    {otherParticipantId && (
                      <div className="text-xs text-gray-500 truncate">To: {otherParticipantName || otherParticipantId}</div>
                    )}
                  </div>
                </div>

                {/* Messages area */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-1"
                >
                  {sortedMessages.map((msg, idx) => {
                    const mine = msg.senderId === currentUser?.uid;
                    const senderName = senderNames[msg.senderId] || (mine ? 'You' : 'Unknown');
                    const prevMsg = sortedMessages[idx - 1];
                    const showSenderName = !mine && (!prevMsg || prevMsg.senderId !== msg.senderId);
                    const isLastFromSender = idx === sortedMessages.length - 1 || sortedMessages[idx + 1]?.senderId !== msg.senderId;

                    return (
                      <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${showSenderName ? 'mt-3' : 'mt-0.5'}`}>
                        {showSenderName && !mine && (
                          <div className="mb-1 px-2 max-w-[85%] sm:max-w-[75%]">
                            <span className="text-xs font-medium text-gray-600">{senderName}</span>
                          </div>
                        )}
                        <div className={`flex ${mine ? 'justify-end' : 'justify-start'} w-full`}>
                          <div className={`${mine ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'} px-3 py-2 rounded-2xl max-w-[85%] sm:max-w-[75%] whitespace-pre-wrap break-words word-break-break-word`}>
                            {msg.content}
                            <div className={`flex items-center gap-1 text-xs mt-1 ${mine ? 'text-emerald-100 justify-end' : 'text-gray-500'}`}>
                              <span>{formatTimestamp(msg.timestamp)}</span>
                              {mine && isLastFromSender && <MessageStatus status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input area */}
                <form onSubmit={handleSend} className="p-2 sm:p-3 border-t flex items-end gap-2 shrink-0">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm sm:text-base"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-6 text-center">
                {showConversationList ? 'Select a conversation to start chatting' : 'No conversations yet'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;


