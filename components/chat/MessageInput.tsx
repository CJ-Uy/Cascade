"use client";

import { useState, useRef, useEffect } from "react";
import { useMessages } from "@/hooks/chat/use-messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MessageInputProps {
  chatId: string;
  disabled?: boolean;
}

export function MessageInput({ chatId, disabled = false }: MessageInputProps) {
  const { sendMessage } = useMessages(chatId);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) return;

    const messageToSend = message.trim();
    setMessage("");
    setIsSending(true);

    try {
      await sendMessage(messageToSend);
    } catch (error) {
      // Restore message if sending failed
      setMessage(messageToSend);
      toast.error(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="bg-background border-t p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || isSending}
            className="max-h-[120px] min-h-[40px] resize-none"
            rows={1}
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={!message.trim() || isSending || disabled}
          className="h-10 w-10 p-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Helper text */}
      <p className="text-muted-foreground mt-2 text-xs">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
