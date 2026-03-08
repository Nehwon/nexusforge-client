import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Session } from '../../../types/session';
import { User } from '../../../types/user';
import { ChatChannel } from '../../../types/chat';
import { useChatStore } from '../../../stores/chatStore';
import WhisperBanner from './WhisperBanner';

type ChatWidgetProps = {
  currentUser: User;
  currentSession: Session;
  role: 'gm' | 'player';
};

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function isDirectChannelWithGm(channel: ChatChannel, gmUserId: string): boolean {
  return channel.kind === 'direct' && channel.memberUserIds.includes(gmUserId);
}

export default function ChatWidget({ currentUser, currentSession, role }: ChatWidgetProps) {
  const {
    channels,
    messages,
    selectedChannelId,
    currentWhisperBannerMessageId,
    userDisplayNames,
    gmUserId,
    selectChannel,
    sendMessage,
    getMessagesForChannel,
    dismissWhisperBanner,
    openWhisperBannerInChat
  } = useChatStore({
    sessionId: currentSession.id,
    gmUserId: currentSession.gmUserId,
    currentUserId: currentUser.id,
    currentUserRole: role
  });

  const [draft, setDraft] = useState('');
  const [whisperToGM, setWhisperToGM] = useState(false);
  const [lastReadAtByChannel, setLastReadAtByChannel] = useState<Record<string, string>>({});

  const visibleChannels = useMemo(
    () =>
      channels.filter((channel) =>
        role === 'gm' ? channel.sessionId === currentSession.id : channel.memberUserIds.includes(currentUser.id)
      ),
    [channels, currentSession.id, currentUser.id, role]
  );

  useEffect(() => {
    if (!visibleChannels.length) {
      return;
    }

    const selectedIsVisible = selectedChannelId
      ? visibleChannels.some((channel) => channel.id === selectedChannelId)
      : false;

    if (!selectedIsVisible) {
      selectChannel(visibleChannels[0].id);
    }
  }, [selectedChannelId, selectChannel, visibleChannels]);

  const selectedChannel = useMemo(
    () => visibleChannels.find((channel) => channel.id === selectedChannelId) ?? null,
    [selectedChannelId, visibleChannels]
  );

  const channelMessages = useMemo(
    () => (selectedChannel ? getMessagesForChannel(selectedChannel.id) : []),
    [getMessagesForChannel, selectedChannel]
  );

  const bannerMessage = useMemo(
    () => messages.find((message) => message.id === currentWhisperBannerMessageId) ?? null,
    [currentWhisperBannerMessageId, messages]
  );

  const handleSelectChannel = (channelId: string) => {
    selectChannel(channelId);
    setLastReadAtByChannel((previous) => ({
      ...previous,
      [channelId]: new Date().toISOString()
    }));
  };

  const computeUnreadCount = (channelId: string): number => {
    const lastReadAt = lastReadAtByChannel[channelId];
    const channelContent = getMessagesForChannel(channelId);

    return channelContent.filter((message) => {
      if (message.fromUserId === currentUser.id) {
        return false;
      }

      if (!lastReadAt) {
        return true;
      }

      return new Date(message.createdAt).getTime() > new Date(lastReadAt).getTime();
    }).length;
  };

  const isWhisperChannel = selectedChannel ? isDirectChannelWithGm(selectedChannel, gmUserId) : false;

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedChannel) {
      return;
    }

    const content = draft.trim();
    if (!content) {
      return;
    }

    sendMessage({
      channelId: selectedChannel.id,
      fromUserId: currentUser.id,
      content,
      options:
        whisperToGM || isWhisperChannel
          ? {
              isPrivateToGM: true,
              importance: 'high'
            }
          : undefined
    });

    setDraft('');
    setWhisperToGM(false);
    setLastReadAtByChannel((previous) => ({
      ...previous,
      [selectedChannel.id]: new Date().toISOString()
    }));
  };

  return (
    <div className="chat-widget">
      {role === 'gm' && bannerMessage ? (
        <WhisperBanner
          fromName={userDisplayNames[bannerMessage.fromUserId] ?? bannerMessage.fromUserId}
          preview={`${bannerMessage.content.slice(0, 80)}${bannerMessage.content.length > 80 ? '...' : ''}`}
          onOpen={openWhisperBannerInChat}
          onDismiss={dismissWhisperBanner}
        />
      ) : null}

      <div className="chat-widget__layout">
        <aside className="chat-widget__sidebar">
          {visibleChannels.map((channel) => {
            const unreadCount = computeUnreadCount(channel.id);
            const isSelected = channel.id === selectedChannelId;
            return (
              <button
                key={channel.id}
                type="button"
                className={`chat-channel-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleSelectChannel(channel.id)}
              >
                <span>{channel.title}</span>
                {unreadCount > 0 ? <span className="chat-channel-item__badge">{unreadCount}</span> : null}
              </button>
            );
          })}
        </aside>

        <section className="chat-widget__messages" aria-live="polite">
          {selectedChannel ? (
            channelMessages.length > 0 ? (
              channelMessages.map((message) => {
                const isOwnMessage = message.fromUserId === currentUser.id;
                const isSystem = message.channelType === 'system';

                if (isSystem) {
                  return (
                    <article key={message.id} className="chat-system-message" aria-label="Message systeme">
                      <span>{message.content}</span>
                    </article>
                  );
                }

                return (
                  <article
                    key={message.id}
                    className={`chat-message ${isOwnMessage ? 'is-own' : 'is-other'} ${
                      message.isPrivateToGM ? 'is-whisper' : ''
                    }`}
                  >
                    <header className="chat-message__meta">
                      <strong>{isOwnMessage ? 'Vous' : userDisplayNames[message.fromUserId] ?? message.fromUserId}</strong>
                      <span>{formatTime(message.createdAt)}</span>
                    </header>
                    <p style={{ margin: 0 }}>{message.content}</p>
                  </article>
                );
              })
            ) : (
              <p style={{ margin: 0 }}>Aucun message dans ce canal.</p>
            )
          ) : (
            <p style={{ margin: 0 }}>Selectionnez un canal.</p>
          )}
        </section>
      </div>

      <form className="chat-widget__composer" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Votre message..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {role === 'player' && !isWhisperChannel ? (
          <label className="chat-widget__whisper-toggle">
            <input
              type="checkbox"
              checked={whisperToGM}
              onChange={(event) => setWhisperToGM(event.target.checked)}
            />
            Message prive au MJ
          </label>
        ) : null}
        <button className="button" type="submit" disabled={!selectedChannel}>
          Envoyer
        </button>
      </form>
    </div>
  );
}
