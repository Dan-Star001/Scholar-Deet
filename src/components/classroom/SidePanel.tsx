import { useState, useRef, useEffect } from "react";
import { 
  Button, 
  TextField, 
  Typography, 
  IconButton, 
  Tabs, 
  Tab, 
  Box,
  Tooltip,
  Paper
} from "@mui/material";
import type { Participant, ChatMessage } from "@/hooks/useSession";
import { Close, Send, PanTool, PushPin, PushPinOutlined } from "@mui/icons-material";
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
              newParts.push(<span key={p.id + index} className="text-secondary font-bold">{mention}</span>);
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
      <div className="flex items-center justify-between border-b border-white/5 z-10 px-4 py-1.5">
        <Tabs 
          value={activeTab} 
          onChange={(_, val) => onTabChange(val)}
          sx={{ minHeight: 40 }}
          slotProps={{
            indicator: { style: { display: 'none' } }
          }}
        >
          <Tab 
            value="chat" 
            label="Chat" 
            className={`min-w-0 px-4 text-[11px] font-bold uppercase tracking-wider h-8 rounded-lg transition-all ${
              activeTab === "chat" ? "bg-muted text-primary" : "text-muted-foreground"
            }`}
          />
          <Tab 
            value="roster" 
            label={`People (${participants.length})`} 
            className={`min-w-0 px-4 text-[11px] font-bold uppercase tracking-wider h-8 rounded-lg transition-all ${
              activeTab === "roster" ? "bg-muted text-primary" : "text-muted-foreground"
            }`}
          />
        </Tabs>
        <IconButton onClick={onClose} size="small" className="text-muted-foreground hover:bg-muted">
          <Close fontSize="small" />
        </IconButton>
      </div>

      {/* Content */}
      {activeTab === "chat" ? (
        <>
          {chatMuted && !isInstructor && (
            <div className="bg-destructive/10 px-4 py-2 text-[10px] font-bold text-destructive text-center uppercase tracking-wider">
              Chat is muted by admin
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
            {pinnedMessageId && messages.find(m => m.id === pinnedMessageId) && (
              <Paper 
                elevation={0}
                className="sticky -top-4 z-10 bg-background/95 backdrop-blur-sm border-b border-secondary/20 p-3 -mx-4 -mt-4 mb-4 cursor-pointer shadow-sm group"
                onClick={() => {
                  document.getElementById(`message-${pinnedMessageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-secondary/20 text-secondary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                    <PushPin fontSize="inherit" /> Pinned
                  </span>
                  <Typography variant="caption" className="font-bold text-foreground/70">
                    {messages.find(m => m.id === pinnedMessageId)?.senderName}
                  </Typography>
                </div>
                <Typography variant="body2" className="text-xs text-foreground/80 line-clamp-2 pr-6 font-medium">
                  {messages.find(m => m.id === pinnedMessageId)?.text}
                </Typography>
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPinMessage?.(null);
                  }}
                  className="absolute right-2 top-3 bg-background border shadow-sm transition-colors hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100"
                  title="Unpin message"
                >
                  <PushPinOutlined fontSize="small" />
                </IconButton>
              </Paper>
            )}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-12 text-center opacity-40">
                <Typography variant="body2" className="text-muted-foreground">No messages yet</Typography>
                <Typography variant="caption" className="mt-1">Start the conversation!</Typography>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} id={`message-${msg.id}`} className="space-y-0.5 group/msg">
                <div className="flex items-baseline gap-2">
                  <Typography variant="caption" className="font-bold text-foreground">{msg.senderName}</Typography>
                  <Typography variant="caption" className="text-[10px] text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                  {isInstructor && (
                    <IconButton 
                      size="small"
                      onClick={() => onPinMessage?.(msg.id === pinnedMessageId ? null : msg.id)}
                      className={`p-1 transition-opacity opacity-0 group-hover/msg:opacity-100 ${
                        msg.id === pinnedMessageId ? "text-secondary hover:bg-secondary/10" : "text-muted-foreground hover:bg-muted"
                      }`}
                      title={msg.id === pinnedMessageId ? "Unpin message" : "Pin message"}
                    >
                      {msg.id === pinnedMessageId ? <PushPinOutlined fontSize="small" /> : <PushPin fontSize="small" />}
                    </IconButton>
                  )}
                </div>
                <Typography variant="body2" className="text-sm leading-relaxed text-foreground/80">
                  {renderMessageText(msg.text)}
                </Typography>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] p-4 z-10 relative bg-background/50">
            {showSuggestions && filteredParticipants.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 bg-background border border-border/50 rounded-xl shadow-xl mb-2 overflow-hidden z-20 backdrop-blur-xl">
                <div className="p-2 border-b border-border/30 bg-muted/30 text-[9px] uppercase font-bold text-muted-foreground tracking-wider">
                  Mention someone
                </div>
                {filteredParticipants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => insertMention(p.name)}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-secondary/10 hover:text-secondary transition-colors flex items-center gap-2"
                  >
                    <div className="h-6 w-6 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-secondary">
                      {p.name.charAt(0)}
                    </div>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={chatMuted && !isInstructor ? "Chat is locked by host..." : "Send a message..."}
                value={draft}
                onChange={(e) => handleTextChange(e as any)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!chatMuted || isInstructor) handleSend();
                  }
                }}
                disabled={chatMuted && !isInstructor}
                variant="outlined"
                slotProps={{
                  input: {
                    className: `rounded-xl text-sm border-0 ${
                      chatMuted && !isInstructor ? "bg-muted/50 cursor-not-allowed italic" : "bg-muted/40"
                    }`,
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    padding: '8px 12px',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                  }
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={!draft.trim() || (chatMuted && !isInstructor)}
                className={`h-10 w-10 rounded-xl shrink-0 transition-all ${
                  chatMuted && !isInstructor 
                    ? "bg-muted text-muted-foreground opacity-50" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                }`}
              >
                <Send fontSize="small" />
              </IconButton>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          {sorted.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors border border-transparent ${
                p.handRaised ? "bg-secondary/10 border-secondary/20" : "hover:bg-muted/40"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-all shadow-sm ${
                  p.isInstructor
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                } ${p.handRaised ? "ring-2 ring-secondary animate-pulse" : ""}`}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <Typography variant="body2" className="font-bold text-foreground truncate">
                  {p.name}
                  {p.isInstructor && (
                    <span className="ml-1.5 text-[9px] text-primary font-bold uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">(Host)</span>
                  )}
                </Typography>
              </div>
              {p.handRaised && <PanTool fontSize="small" className="text-secondary shrink-0" />}
              <div
                className={`h-2 w-2 rounded-full shrink-0 shadow-sm ${
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
