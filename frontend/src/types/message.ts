export type ChannelType = 'global' | 'group' | 'direct' | 'system';
export type SystemMessageType = 'turn' | 'round' | 'combat_start' | 'combat_end';

export type MessageImportance = 'low' | 'normal' | 'high' | 'critical';

export interface MessageUI {
  shouldShowBanner?: boolean;
  importance?: MessageImportance;
  autoPinOnGM?: boolean;
}

export interface Message {
  id: string;
  sessionId: string;
  channelType: ChannelType;
  fromUserId: string;
  toUserIds?: string[];
  groupId?: string;
  content: string;
  createdAt: string;
  isPrivateToGM?: boolean;
  ui?: MessageUI;
  channelId?: string;
  systemType?: SystemMessageType;
}
