import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Participant, ChatMessage } from "@/hooks/useSession";
import { X, Send, Hand, Pin, PinOff, UserX } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getProfanity } from "@/utils/profanityFilter";

interface SidePanelProps {
  activeTab: "chat" | "roster";
  participants: Participant[];
  messages: ChatMessage[];
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onTabChange: (tab: "chat" | "roster") => void;
  onPinMessage?: (messageId: string | null) => void;
  isInstructor?: boolean;
  pinnedMessageId?: string | null;
  chatMuted?: boolean;
}

export function SidePanel({
  activeTab,
  participants,
  messages,
  onClose,
  onSendMessage,
  onTabChange,
  onPinMessage,
  isInstructor = false,
  pinnedMessageId = null,
  chatMuted = false,
  currentUserId = "",
}: SidePanelProps & { currentUserId?: string }) {
  const [draft, setDraft] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sorted = [...participants].sort((a, b) => {
    if (a.handRaised && !b.handRaised) return -1;
    if (!a.handRaised && b.handRaised) return 1;
    if (a.isInstructor && !b.isInstructor) return -1;
    return 0;
  });

  const handleSend = () => {
    if (!draft.trim()) return;
    
    // Check for profanity
    const badWords = getProfanity(draft);
    if (badWords.length > 0) {
      toast.error(`Words like '${badWords[0]}' are not allowed here.`, {
        className: "!bg-red-600 !text-white !border-none",
        duration: 4000,
      });
    }

    onSendMessage(draft.trim());
    setDraft("");
    setShowSuggestions(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setDraft(val);
    setCursorPos(pos);

    const lastAt = val.lastIndexOf("@", pos - 1);
    if (lastAt !== -1) {
      const textAfterAt = val.slice(lastAt + 1, pos);
      // Only show suggestions if there's no space between @ and cursor
      if (!textAfterAt.includes(" ")) {
        setMentionSearch(textAfterAt.toLowerCase());
        setShowSuggestions(true);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const insertMention = (name: string) => {
    const lastAt = draft.lastIndexOf("@", cursorPos - 1);
    if (lastAt === -1) return;

    const before = draft.slice(0, lastAt);
    const after = draft.slice(cursorPos);
    const newText = `${before}@${name} ${after}`;
    setDraft(newText);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const filteredParticipants = participants
    .filter(p => p.id !== currentUserId && p.name.toLowerCase().includes(mentionSearch))
    .slice(0, 5);

  const renderMessageText = (text: string) => {
    if (!text.includes("@")) return <span>{text}</span>;

    // Sort participants by name length descending to match longer names first (e.g., "John Doe" before "John")
    const sortedParticipants = [...participants].sort((a, b) => b.name.length - a.name.length);
    
    let parts: (string | JSX.Element)[] = [text];

    sortedParticipants.forEach(p => {
      const mention = `@${p.name}`;
      const newParts: (string | JSX.Element)[] = [];
      
      parts.forEach(part => {
        if (typeof part === "string") {
          const splitParts = part.split(mention);
          splitParts.forEach((splitPart, index) => {
            newParts.push(splitPart);
            if (index < splitParts.length - 1) {
              newParts.push(<span key={p.id + index} className="text-primary font-bold">{mention}</span>);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return <>{parts}</>;
  };
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.2 }}
      className="flex h-full w-72 sm:w-80 flex-col glass-premium !bg-background/80 backdrop-blur-2xl shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)] z-30 border-l border-white/5"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 z-10 px-4 py-3">
        <div className="flex bg-muted/40 backdrop-blur-sm rounded-lg p-0.5">
          <button
            onClick={() => onTabChange("chat")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "chat"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => onTabChange("roster")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "roster"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            People ({participants.length})
          </button>
        </div>
        <button onClick={onClose} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      {activeTab === "chat" ? (
        <>
          {chatMuted && !isInstructor && (
            <div className="bg-destructive/10 px-4 py-2 text-[10px] font-medium text-destructive text-center uppercase tracking-wider">
              Chat is muted by admin
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
            {pinnedMessageId && messages.find(m => m.id === pinnedMessageId) && (
              <div 
                className="sticky -top-4 z-10 bg-background border-b border-primary/20 p-3 -mx-4 -mt-4 mb-4 cursor-pointer shadow-sm group"
                onClick={() => {
                  document.getElementById(`message-${pinnedMessageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </span>
                  <span className="text-[10px] font-semibold text-foreground/70">
                    {messages.find(m => m.id === pinnedMessageId)?.senderName}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 line-clamp-2 pr-6">
                  {messages.find(m => m.id === pinnedMessageId)?.text}
                </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onPinMessage?.(null);
                      }}
                      className="absolute right-2 top-3 h-6 w-6 rounded-full flex items-center justify-center bg-background border shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive opacity-0 group-hover:opacity-100"
                      title="Unpin message"
                    >
                      <PinOff className="h-3 w-3" />
                    </button>
              </div>
            )}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-12 text-center">
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation!</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} id={`message-${msg.id}`} className="space-y-0.5 group/msg">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-foreground">{msg.senderName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isInstructor && (
                    <button 
                      onClick={() => onPinMessage?.(msg.id === pinnedMessageId ? null : msg.id)}
                      className={`text-[10px] p-1 rounded-full transition-opacity opacity-0 group-hover/msg:opacity-100 ${
                        msg.id === pinnedMessageId ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                      }`}
                      title={msg.id === pinnedMessageId ? "Unpin message" : "Pin message"}
                    >
                      {msg.id === pinnedMessageId ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    </button>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">
                  {renderMessageText(msg.text)}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-3 z-10 relative">
            {showSuggestions && filteredParticipants.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 bg-background border rounded-lg shadow-lg mb-2 overflow-hidden z-20">
                <div className="p-2 border-b bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Mention someone
                </div>
                {filteredParticipants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => insertMention(p.name)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                      {p.name.charAt(0)}
                    </div>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                placeholder={chatMuted && !isInstructor ? "Chat is locked by host..." : "Send a message..."}
                value={draft}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!chatMuted || isInstructor) handleSend();
                  }
                }}
                rows={1}
                disabled={chatMuted && !isInstructor}
                className={`w-full min-h-[36px] max-h-32 py-2 px-3 resize-none overflow-y-auto rounded-lg border-0 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors ${
                  chatMuted && !isInstructor ? "bg-muted/50 cursor-not-allowed italic" : "bg-muted"
                }`}
                style={{ fieldSizing: "content" } as any}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!draft.trim() || (chatMuted && !isInstructor)}
                className={`h-9 w-9 rounded-lg shrink-0 transition-all ${
                  chatMuted && !isInstructor 
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          {sorted.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                p.handRaised ? "bg-warning/10" : "hover:bg-muted"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shrink-0 ${
                  p.isInstructor
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                } ${p.handRaised ? "ring-2 ring-warning animate-pulse-glow" : ""}`}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {p.name}
                  {p.isInstructor && (
                    <span className="ml-1.5 text-[10px] text-primary font-medium">(Host)</span>
                  )}
                </p>
              </div>
              {p.handRaised && <Hand className="h-4 w-4 text-warning shrink-0" />}
              <div
                className={`h-2 w-2 rounded-full shrink-0 ${
                  p.isMuted ? "bg-muted-foreground/30" : "bg-success"
                }`}
              />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
