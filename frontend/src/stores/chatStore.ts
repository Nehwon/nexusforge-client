import { useCallback, useEffect, useMemo, useState } from 'react';
import { messageRepository } from '../data/repositories';
import { ChatChannel } from '../types/chat';
import { Message, MessageImportance, SystemMessageType } from '../types/message';

type ChatStoreOptions = {
  sessionId: string;
  gmUserId: string;
  currentUserId: string;
  currentUserRole: 'gm' | 'player';
};

export interface ChatStoreState {
  channels: ChatChannel[];
  messages: Message[];
  selectedChannelId: string | null;
  currentWhisperBannerMessageId: string | null;
  userDisplayNames: Record<string, string>;
  gmUserId: string;
  selectChannel: (channelId: string) => void;
  sendMessage: (params: {
    channelId: string;
    fromUserId: string;
    content: string;
    options?: {
      isPrivateToGM?: boolean;
      importance?: MessageImportance;
    };
  }) => void;
  sendSystemMessage: (params: {
    sessionId: string;
    content: string;
    systemType: SystemMessageType;
  }) => void;
  getMessagesForChannel: (channelId: string) => Message[];
  dismissWhisperBanner: () => void;
  openWhisperBannerInChat: () => void;
}

type SessionChatState = {
  channels: ChatChannel[];
  messages: Message[];
  selectedChannelId: string | null;
  currentWhisperBannerMessageId: string | null;
  userDisplayNames: Record<string, string>;
  gmUserId: string;
};

const sessionStates = new Map<string, SessionChatState>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function buildInitialSessionState(sessionId: string, gmUserId: string): SessionChatState {
  const playerOneId = 'user-player-1';
  const playerTwoId = 'user-player-2';
  const allMembers = [gmUserId, playerOneId, playerTwoId];

  const globalChannelId = `${sessionId}-channel-global`;

  return {
    channels: [
      {
        id: globalChannelId,
        kind: 'global',
        title: 'Global',
        sessionId,
        memberUserIds: allMembers
      },
      {
        id: `${sessionId}-channel-direct-gm-player-1`,
        kind: 'direct',
        title: 'MP - MJ / Joueur 1',
        sessionId,
        memberUserIds: [gmUserId, playerOneId]
      },
      {
        id: `${sessionId}-channel-direct-player-1-player-2`,
        kind: 'direct',
        title: 'MP - Joueur 1 / Joueur 2',
        sessionId,
        memberUserIds: [playerOneId, playerTwoId]
      },
      {
        id: `${sessionId}-channel-group-a`,
        kind: 'group',
        title: 'Groupe A',
        sessionId,
        memberUserIds: [gmUserId, playerOneId]
      }
    ],
    messages: [],
    selectedChannelId: globalChannelId,
    currentWhisperBannerMessageId: null,
    userDisplayNames: {
      [gmUserId]: 'MJ Mock',
      [playerOneId]: 'Joueur Mock',
      [playerTwoId]: 'Joueur 2'
    },
    gmUserId
  };
}

function getSessionState(sessionId: string, gmUserId: string): SessionChatState {
  const existing = sessionStates.get(sessionId);
  if (existing) {
    if (existing.gmUserId !== gmUserId) {
      existing.gmUserId = gmUserId;
    }
    return existing;
  }

  const state = buildInitialSessionState(sessionId, gmUserId);
  sessionStates.set(sessionId, state);
  return state;
}

async function hydrateSessionMessages(sessionId: string, gmUserId: string): Promise<void> {
  const state = getSessionState(sessionId, gmUserId);
  const persistedMessages = await messageRepository.listForSession(sessionId);
  state.messages = persistedMessages;

  const latestIncomingWhisper = [...persistedMessages]
    .reverse()
    .find((message) => message.isPrivateToGM && message.fromUserId !== gmUserId && message.ui?.shouldShowBanner);

  state.currentWhisperBannerMessageId = latestIncomingWhisper?.id ?? null;
  notifyListeners();
}

export function sendSystemMessage(params: { sessionId: string; content: string; systemType: SystemMessageType }): void {
  const fallbackGmUserId = 'user-gm-1';
  const state = getSessionState(params.sessionId, sessionStates.get(params.sessionId)?.gmUserId ?? fallbackGmUserId);
  const globalChannel = state.channels.find((channel) => channel.kind === 'global' && channel.sessionId === params.sessionId);

  if (!globalChannel) {
    return;
  }

  const trimmedContent = params.content.trim();
  if (!trimmedContent) {
    return;
  }

  const importance: MessageImportance =
    params.systemType === 'combat_start' || params.systemType === 'combat_end' ? 'high' : 'normal';

  const systemMessage: Message = {
    id: `${params.sessionId}-system-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: params.sessionId,
    channelId: globalChannel.id,
    channelType: 'system',
    fromUserId: 'system',
    content: trimmedContent,
    createdAt: new Date().toISOString(),
    systemType: params.systemType,
    ui: {
      importance
    }
  };

  void (async () => {
    await messageRepository.create(systemMessage);
    state.messages = [...state.messages, systemMessage];
    notifyListeners();
  })();
}

export function useChatStore({
  sessionId,
  gmUserId,
  currentUserId,
  currentUserRole
}: ChatStoreOptions): ChatStoreState {
  const [, forceRender] = useState(0);

  useEffect(() => subscribe(() => forceRender((value) => value + 1)), []);

  const sessionState = useMemo(() => getSessionState(sessionId, gmUserId), [sessionId, gmUserId]);

  useEffect(() => {
    void hydrateSessionMessages(sessionId, gmUserId);
  }, [gmUserId, sessionId]);

  const selectChannel = useCallback(
    (channelId: string) => {
      sessionState.selectedChannelId = channelId;
      notifyListeners();
    },
    [sessionState]
  );

  const sendMessage = useCallback(
    (params: {
      channelId: string;
      fromUserId: string;
      content: string;
      options?: {
        isPrivateToGM?: boolean;
        importance?: MessageImportance;
      };
    }) => {
      const channel = sessionState.channels.find((item) => item.id === params.channelId);
      if (!channel) {
        return;
      }

      const trimmedContent = params.content.trim();
      if (!trimmedContent) {
        return;
      }

      const otherMembers = channel.memberUserIds.filter((userId) => userId !== params.fromUserId);
      const isDirectGmConversation = channel.kind === 'direct' && channel.memberUserIds.includes(gmUserId);
      const shouldMarkAsWhisper = params.options?.isPrivateToGM === true || isDirectGmConversation;
      const isIncomingGmWhisper = shouldMarkAsWhisper && params.fromUserId !== gmUserId;

      const message: Message = {
        id: `${sessionId}-message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionId,
        channelId: channel.id,
        channelType: 'global',
        fromUserId: params.fromUserId,
        content: trimmedContent,
        createdAt: new Date().toISOString()
      };

      if (channel.kind === 'group') {
        message.channelType = 'group';
        message.groupId = channel.id;
      }

      if (channel.kind === 'direct') {
        message.channelType = 'direct';
        message.toUserIds = otherMembers;
      }

      if (shouldMarkAsWhisper) {
        message.channelType = 'direct';
        message.toUserIds = [gmUserId];
        message.isPrivateToGM = true;
        message.ui = {
          shouldShowBanner: isIncomingGmWhisper,
          importance: params.options?.importance ?? 'high'
        };
      }

      void (async () => {
        await messageRepository.create(message);
        sessionState.messages = [...sessionState.messages, message];

        if (currentUserRole === 'gm' && isIncomingGmWhisper && message.ui?.shouldShowBanner) {
          sessionState.currentWhisperBannerMessageId = message.id;
        }

        notifyListeners();
      })();
    },
    [currentUserRole, gmUserId, sessionId, sessionState]
  );

  const getMessagesForChannel = useCallback(
    (channelId: string) =>
      sessionState.messages
        .filter((message) => message.channelId === channelId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [sessionState]
  );

  const dismissWhisperBanner = useCallback(() => {
    sessionState.currentWhisperBannerMessageId = null;
    notifyListeners();
  }, [sessionState]);

  const openWhisperBannerInChat = useCallback(() => {
    if (!sessionState.currentWhisperBannerMessageId) {
      return;
    }

    const whisperMessage = sessionState.messages.find(
      (message) => message.id === sessionState.currentWhisperBannerMessageId
    );
    if (!whisperMessage?.channelId) {
      sessionState.currentWhisperBannerMessageId = null;
      notifyListeners();
      return;
    }

    sessionState.selectedChannelId = whisperMessage.channelId;
    sessionState.currentWhisperBannerMessageId = null;
    notifyListeners();
  }, [sessionState]);

  return {
    channels: sessionState.channels,
    messages: sessionState.messages,
    selectedChannelId: sessionState.selectedChannelId,
    currentWhisperBannerMessageId: currentUserRole === 'gm' ? sessionState.currentWhisperBannerMessageId : null,
    userDisplayNames: {
      ...sessionState.userDisplayNames,
      [currentUserId]: sessionState.userDisplayNames[currentUserId] ?? 'Vous'
    },
    gmUserId,
    selectChannel,
    sendMessage,
    sendSystemMessage,
    getMessagesForChannel,
    dismissWhisperBanner,
    openWhisperBannerInChat
  };
}
