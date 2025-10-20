"use client";

import { useState, useEffect } from 'react';
import { useChats } from '@/hooks/chat/use-chats';
import { useUsers } from '@/hooks/chat/use-users';
import { useSession } from '@/app/contexts/SessionProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createPrivateChat?: boolean;
  selectedUser?: { id: string; name: string };
}

export function CreateGroupModal({ open, onOpenChange, createPrivateChat = false, selectedUser }: CreateGroupModalProps) {
  const { createChat } = useChats();
  const { searchUsers, users, loading: usersLoading } = useUsers();
  const { selectedBuId } = useSession();
  
  const [chatName, setChatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery, selectedBuId || undefined);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, selectedBuId, searchUsers]);

  const handleUserToggle = (userId: string) => {
    if (createPrivateChat) {
      // For private chats, only allow one selection
      setSelectedUsers([userId]);
    } else {
      // For group chats, allow multiple selections
      setSelectedUsers(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleCreate = async () => {
    if (createPrivateChat) {
      // For private chats, we need exactly one selected user
      if (selectedUsers.length !== 1) {
        toast.error('Please select exactly one person to start a private chat');
        return;
      }
      
      const selectedUser = users.find(u => u.id === selectedUsers[0]);
      if (!selectedUser) {
        toast.error('Selected user not found');
        return;
      }
      
      setIsCreating(true);
      try {
        await createChat({
          name: `Private Chat with ${selectedUser.name}`,
          participantIds: [selectedUser.id],
          isPrivate: true,
        });
        
        toast.success('Private chat created successfully!');
        onOpenChange(false);
        resetForm();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create private chat');
      } finally {
        setIsCreating(false);
      }
    } else {
      // For group chats
      if (!chatName.trim()) {
        toast.error('Please enter a chat name');
        return;
      }

      if (selectedUsers.length === 0) {
        toast.error('Please select at least one person to add to the chat');
        return;
      }

      setIsCreating(true);
      try {
        await createChat({
          name: chatName.trim(),
          participantIds: selectedUsers,
          isPrivate: false,
        });
        
        toast.success('Group chat created successfully!');
        onOpenChange(false);
        resetForm();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create group chat');
      } finally {
        setIsCreating(false);
      }
    }
  };

  const resetForm = () => {
    setChatName('');
    setSearchQuery('');
    setSelectedUsers([]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {createPrivateChat ? 'Start Private Chat' : 'Create Group Chat'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chat Name - Only show for group chats */}
          {!createPrivateChat && (
            <div className="space-y-2">
              <Label htmlFor="chatName">Chat Name</Label>
              <Input
                id="chatName"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Enter chat name..."
                disabled={isCreating}
              />
            </div>
          )}

          {/* Add People */}
          <div className="space-y-2">
            <Label>
              {createPrivateChat ? 'Select Person' : 'Add People'}
            </Label>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={createPrivateChat ? "Search for a person..." : "Search people..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isCreating}
                className="pl-10"
              />
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Selected ({selectedUsers.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(userId => {
                    const user = users.find(u => u.id === userId);
                    if (!user) return null;
                    
                    return (
                      <div
                        key={userId}
                        className="flex items-center space-x-2 bg-muted px-2 py-1 rounded-md"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => handleUserToggle(userId)}
                          disabled={isCreating}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User List */}
            {searchQuery.trim() && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Search Results
                </Label>
                <ScrollArea className="h-32">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {users.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => handleUserToggle(user.id)}
                        >
                          {createPrivateChat ? (
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedUsers.includes(user.id) 
                                ? 'border-primary bg-primary' 
                                : 'border-muted-foreground'
                            }`} />
                          ) : (
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleUserToggle(user.id)}
                              disabled={isCreating}
                            />
                          )}
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              isCreating || 
              (createPrivateChat ? selectedUsers.length !== 1 : (!chatName.trim() || selectedUsers.length === 0))
            }
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                {createPrivateChat ? 'Start Private Chat' : 'Create Group Chat'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
