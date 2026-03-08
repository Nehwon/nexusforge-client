export type MessageChannelType = 'global' | 'group' | 'direct' | 'system';

export interface Message {
  id: string;
  sessionId: string;
  channelType: MessageChannelType;
  fromUserId: string;
  content: string;
  createdAt: string;
  channelId?: string | null;
  toUserIds?: string[];
}
