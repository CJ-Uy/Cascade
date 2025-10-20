// Chat-related TypeScript types

export type ChatType = 'PRIVATE' | 'GROUP';

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: User;
}

export interface Participant {
  userId: string;
  name: string;
  avatar?: string;
  lastReadAt?: string;
  joinedAt: string;
  isCreator?: boolean;
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  participantCount: number;
  lastMessage?: Message;
}

export interface CreateChatRequest {
  name?: string; // Optional for private chats, required for group chats
  participantIds: string[];
  isPrivate?: boolean;
}

export interface SendMessageRequest {
  content: string;
}

export interface AddParticipantsRequest {
  userIds: string[];
}

// API Response types
export interface ChatsResponse {
  chats: Chat[];
}

export interface MessagesResponse {
  messages: Message[];
}

export interface ParticipantsResponse {
  participants: Participant[];
}

export interface UsersResponse {
  users: User[];
}

export interface MessageResponse {
  message: Message;
}

export interface ChatResponse {
  chat: Chat;
}

// Error response type
export interface ApiError {
  error: string;
}

// Hook return types
export interface UseChatsReturn {
  chats: Chat[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createChat: (chatData: CreateChatRequest) => Promise<Chat>;
  cleanup: () => void;
}

export interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  refetch: () => Promise<void>;
  addMessage: (message: Message) => void;
}

export interface UseParticipantsReturn {
  participants: Participant[];
  loading: boolean;
  error: string | null;
  addParticipants: (userIds: string[]) => Promise<void>;
  removeParticipant: (userId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  searchUsers: (query: string, businessUnitId?: string) => Promise<void>;
}

// Hook imports - updated to new file structure
export { useChats } from '@/hooks/chat/use-chats';
export { useMessages } from '@/hooks/chat/use-messages';
export { useParticipants } from '@/hooks/chat/use-participants';
export { useUsers } from '@/hooks/chat/use-users';
export { useRealtimeMessages } from '@/hooks/chat/use-realtime-messages';

// Real-time message type for subscriptions
export interface RealtimeMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  chat_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    image_url?: string;
  };
}
