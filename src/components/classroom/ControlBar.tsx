import { useState } from "react";
import {  IconButton,  Button,  Typography,  Tooltip,  Popover, Box, Badge } from "@mui/material";
import { 
  Mic, 
  MicOff, 
  Videocam, 
  VideocamOff, 
  PanTool, 
  VolumeOff, 
  EmojiEmotions, 
  Groups, 
  Chat,
  CallEnd, 
  Logout,
  VolumeUp,
  Lock,
  LockOpen
} from "@mui/icons-material";

interface ControlBarProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  isInstructor: boolean;
  participantCount: number;
  unreadMessages: number;
  activeSidePanel: "chat" | "roster" | null;
  chatMuted?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreen: () => void;
  onToggleHand: () => void;
  onTogglePanel: (panel: "chat" | "roster") => void;
  onSendReaction: (emoji: string) => void;
  onToggleChatMute?: () => void;
  onLeave: () => void;
  onMuteAll?: () => void;
  mutesLocked?: boolean;
  onReleaseMutes?: () => void;
}

export function ControlBar({
  isMuted,
  isVideoOn,
  isScreenSharing,
  handRaised,
  isInstructor,
  participantCount,
  unreadMessages,
  activeSidePanel,
  chatMuted = false,
  onToggleMute,
  onToggleVideo,
  onToggleScreen,
  onToggleHand,
  onTogglePanel,
  onSendReaction,
  onToggleChatMute,
  onLeave,
  onMuteAll,
  mutesLocked = false,
  onReleaseMutes,
}: ControlBarProps) {
  const emojis = ["👋", "👏", "👍", "❤️", "😂", "😮", "🎉", "🔥"];
  const [reactionAnchor, setReactionAnchor] = useState<HTMLElement | null>(null);

  const handleOpenReactions = (event: React.MouseEvent<HTMLElement>) => {
    setReactionAnchor(event.currentTarget);
  };

  const handleCloseReactions = () => {
    setReactionAnchor(null);
  };

  const reactionOpen = Boolean(reactionAnchor);

  return (
    <div className="flex items-center justify-center px-4 sm:px-8 py-3 glass-premium !bg-background/80 backdrop-blur-2xl shadow-2xl z-20 mx-4 mb-4 rounded-3xl border border-white/5">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
        {/* Mute */}
        <Tooltip title={!isInstructor && mutesLocked ? "Mic locked by host" : isMuted ? "Unmute" : "Mute"}>
          <IconButton
            onClick={onToggleMute}
            disabled={!isInstructor && mutesLocked}
            className={`h-11 w-11 rounded-2xl transition-all ${
              isMuted
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-muted text-foreground hover:bg-muted-foreground/15"
            } ${!isInstructor && mutesLocked ? "opacity-50 cursor-not-allowed" : ""}`}
            size="small"
          >
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>
        </Tooltip>

        {/* Video */}
        <Tooltip title={isVideoOn ? "Turn off camera" : "Turn on camera"}>
          <IconButton
            onClick={onToggleVideo}
            className={`h-11 w-11 rounded-2xl transition-all ${
              !isVideoOn
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-muted text-foreground hover:bg-muted-foreground/15"
            }`}
            size="small"
          >
            {isVideoOn ? <Videocam /> : <VideocamOff />}
          </IconButton>
        </Tooltip>

        {/* Hand Raise */}
        <Tooltip title={handRaised ? "Lower Hand" : "Raise Hand"}>
          <IconButton
            onClick={onToggleHand}
            className={`h-11 w-11 rounded-2xl transition-all ${
              handRaised
                ? "bg-secondary text-secondary-foreground shadow-[0_0_15px_rgba(146,220,229,0.5)] animate-pulse"
                : "bg-muted text-foreground hover:bg-muted-foreground/15"
            }`}
            size="small"
          >
            <PanTool />
          </IconButton>
        </Tooltip>

        {/* Mute All - Instructor only */}
        {onMuteAll && (
          <Tooltip title="Mute Students">
            <IconButton
              onClick={onMuteAll}
              className={`h-11 w-11 rounded-2xl transition-all ${
                mutesLocked ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground hover:bg-secondary/20 hover:text-secondary"
              }`}
              size="small"
            >
              <VolumeOff />
            </IconButton>
          </Tooltip>
        )}

        {/* Release Mics - Instructor only */}
        {isInstructor && mutesLocked && onReleaseMutes && (
          <Tooltip title="Release mics">
            <IconButton
              onClick={onReleaseMutes}
              className="h-11 w-11 rounded-2xl transition-all bg-success/20 text-success hover:bg-success/30 shadow-sm"
              size="small"
            >
              <VolumeUp />
            </IconButton>
          </Tooltip>
        )}

        {/* Reactions */}
        <div>
          <Tooltip title="Reactions">
            <IconButton 
              onClick={handleOpenReactions}
              className="h-11 w-11 rounded-2xl transition-all bg-muted text-foreground hover:bg-muted-foreground/15"
              size="small"
            >
              <EmojiEmotions />
            </IconButton>
          </Tooltip>
          <Popover
            open={reactionOpen}
            anchorEl={reactionAnchor}
            onClose={handleCloseReactions}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            slotProps={{
              paper: {
                className: "rounded-2xl p-2 mb-2 bg-background/90 backdrop-blur-xl border border-white/10 shadow-2xl",
              }
            }}
          >
            <div className="flex gap-1">
              {emojis.map((emoji) => (
                <IconButton
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    handleCloseReactions();
                  }}
                  className="h-10 w-10 text-xl hover:bg-muted/50 rounded-xl transition-all hover:scale-110"
                >
                  {emoji}
                </IconButton>
              ))}
            </div>
          </Popover>
        </div>

        <div className="h-8 w-px bg-border/20 mx-1 hidden sm:block" />

        {/* Roster */}
        <Tooltip title="Participants">
          <IconButton
            onClick={() => onTogglePanel("roster")}
            className={`h-11 w-11 rounded-2xl transition-all ${
              activeSidePanel === "roster"
                ? "bg-primary/10 text-primary shadow-inner"
                : "bg-muted text-foreground hover:bg-muted-foreground/15"
            }`}
            size="small"
          >
            <Badge badgeContent={participantCount} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 'bold' } }}>
              <Groups />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Chat Toggle (Instructor only) */}
        {isInstructor && onToggleChatMute && (
          <Tooltip title={chatMuted ? "Unlock Chat" : "Lock Chat"}>
            <IconButton
              onClick={onToggleChatMute}
              className={`h-11 w-11 rounded-2xl transition-all z-20 ${
                chatMuted
                  ? "bg-secondary text-secondary-foreground shadow-[0_0_20px_rgba(146,220,229,0.4)] ring-2 ring-secondary/50"
                  : "bg-muted text-foreground hover:bg-muted-foreground/15"
              }`}
              size="small"
            >
              {chatMuted ? <Lock /> : <LockOpen />}
            </IconButton>
          </Tooltip>
        )}

        {/* Chat */}
        <Tooltip title="Chat">
          <IconButton
            onClick={() => onTogglePanel("chat")}
            className={`h-11 w-11 rounded-2xl transition-all ${
              activeSidePanel === "chat"
                ? "bg-primary/10 text-primary shadow-inner"
                : "bg-muted text-foreground hover:bg-muted-foreground/15"
            }`}
            size="small"
          >
            <Badge badgeContent={unreadMessages} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 'bold' } }}>
              <Chat />
            </Badge>
          </IconButton>
        </Tooltip>

        <div className="h-8 w-px bg-border/20 mx-1 hidden sm:block" />

        <Button
          variant="contained"
          onClick={onLeave}
          className={`h-11 rounded-2xl px-5 font-bold shadow-lg transition-all active:scale-95 normal-case ${
            isInstructor ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }`}
          startIcon={isInstructor ? <CallEnd /> : <Logout />}
        >
          {isInstructor ? "End" : "Leave"}
        </Button>
      </div>
    </div>
  );
}
