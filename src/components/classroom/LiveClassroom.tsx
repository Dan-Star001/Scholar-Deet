import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ControlBar } from "./ControlBar";
import { SidePanel } from "./SidePanel";
import { VideoGrid } from "./VideoGrid";
import { AccessTime, Link as LinkIcon, Check, LightMode, DarkMode } from "@mui/icons-material";
import { AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import type { Session } from "@/hooks/useSession";
import { useAgora } from "@/hooks/useAgora";
import { AGORA_APP_ID } from "@/utils/agora";
import { toast } from "sonner";
import { 
  Button, 
  IconButton, 
  Typography, 
  Tooltip, 
  Box, 
  Chip 
} from "@mui/material";

interface LiveClassroomProps {
  session: Session;
  currentUserId: string;
  isInstructor: boolean;
  elapsed: number;
  onEndSession: () => void;
  onSendMessage: (text: string) => void;
  onToggleHand: () => void;
  onMuteAll?: () => void;
  onUpdateMuteState?: (participantId: string, isMuted: boolean) => void;
  onUpdateParticipantAgoraUid?: (participantId: string, agoraUid: number) => void;
  onUpdateNetworkQuality?: (participantId: string, quality: number) => void;
  onPinMessage?: (messageId: string | null) => void;
  onToggleChatMute?: () => void;
  onSendReaction?: (emoji: string) => void;
  onReleaseMutes?: () => void;
  initialMuted?: boolean;
  initialVideoOn?: boolean;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function LiveClassroom({
  session,
  currentUserId,
  isInstructor,
  elapsed,
  onEndSession,
  onSendMessage,
  onToggleHand,
  onMuteAll,
  onUpdateMuteState,
  onUpdateParticipantAgoraUid,
  onUpdateNetworkQuality,
  onPinMessage,
  onToggleChatMute,
  onSendReaction,
  onReleaseMutes,
  initialMuted = false,
  initialVideoOn = true,
}: LiveClassroomProps) {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isVideoOn, setIsVideoOn] = useState(initialVideoOn);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [sidePanel, setSidePanel] = useState<"chat" | "roster" | null>(null);
  const [unread, setUnread] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const { theme, setTheme } = useTheme();

  const agoraChannel = AGORA_APP_ID ? session.id : null;
  const { join, leave, joined, remoteUsers, localVideoTrack, localUid, localNetworkQuality, toggleMute, toggleVideo } =
    useAgora(agoraChannel);

  useEffect(() => {
    if (agoraChannel && !joined) {
      join();
    }
    return () => {
      if (joined) leave();
    };
  }, [agoraChannel]);

  useEffect(() => {
    if (localUid && onUpdateParticipantAgoraUid) {
      onUpdateParticipantAgoraUid(currentUserId, localUid);
    }
  }, [localUid, onUpdateParticipantAgoraUid, currentUserId]);

  useEffect(() => {
    if (joined) {
      toggleMute(initialMuted);
      toggleVideo(initialVideoOn);
    }
  }, [joined]);

  // Track unread messages when panel is closed
  useEffect(() => {
    if (sidePanel !== "chat" && session.chat.length > 0) {
      setUnread((n) => n + 1);
    }
  }, [session.chat.length]);

  const classLink = `${window.location.origin}/class/${session.id}`;

  const copyClassLink = () => {
    navigator.clipboard.writeText(classLink);
    setLinkCopied(true);
    toast.success("Class link copied to clipboard!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const togglePanel = (panel: "chat" | "roster") => {
    if (sidePanel === panel) {
      setSidePanel(null);
    } else {
      setSidePanel(panel);
      if (panel === "chat") setUnread(0);
    }
  };

  const handleToggleHand = () => {
    setHandRaised(!handRaised);
    onToggleHand();
  };

  const handleToggleMute = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await toggleMute(newMuted);
    onUpdateMuteState?.(currentUserId, newMuted);
  };

  const handleToggleVideo = async () => {
    const newVideoOn = !isVideoOn;
    setIsVideoOn(newVideoOn);
    await toggleVideo(newVideoOn);
  };

  const handleMuteAll = () => {
    if (onMuteAll) {
      onMuteAll();
      toast.success("All students have been muted");
    }
  };

  const handleLeave = async () => {
    await leave();
    onEndSession();
  };

  const activeParticipants = session.participants.filter(p => !p.leftAt);
  const currentUser = session.participants.find(p => p.id === currentUserId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === " " && !e.repeat) { e.preventDefault(); handleToggleMute(); }
      else if (e.ctrlKey && e.key.toLowerCase() === "d") { e.preventDefault(); handleToggleVideo(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMuted, isVideoOn, joined]);

  useEffect(() => {
    if (localNetworkQuality !== undefined && joined) {
      onUpdateNetworkQuality?.(currentUserId, localNetworkQuality);
    }
  }, [localNetworkQuality, joined, onUpdateNetworkQuality, currentUserId]);

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-background/60 backdrop-blur-xl border-b border-white/5 z-10">
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <img src="/scholar-deet-logo.png" alt="Scholar Deet" className="h-20 w-20 shrink-0" />
          <Typography variant="subtitle1" className="font-bold text-foreground truncate max-w-[150px] sm:max-w-xs">{session.name}</Typography>
          
          <Box className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-2xl border border-white/5">
            <AccessTime fontSize="small" className="text-muted-foreground" />
            <Typography variant="caption" className="font-bold font-mono tracking-tight">{formatTime(elapsed)}</Typography>
          </Box>

          <Chip 
            label="Live" 
            size="small" 
            color="success" 
            variant="filled" 
            className="font-black text-[10px] uppercase tracking-widest h-5 px-1 animate-pulse" 
          />
        </div>

        <div className="flex items-center gap-3">
          <Tooltip title="Toggle Theme">
            <IconButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-10 w-10 rounded-xl bg-muted/40 hover:bg-muted/80 text-foreground transition-all"
            >
              {theme === "dark" ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            onClick={copyClassLink}
            className="rounded-xl border-border px-3 sm:px-4 py-2 text-xs font-bold text-foreground hover:bg-muted normal-case h-10 transition-all font-bold"
            startIcon={linkCopied ? <Check fontSize="small" className="text-success" /> : <LinkIcon fontSize="small" />}
          >
             <span className="hidden sm:inline">{linkCopied ? "Copied!" : "Share Link"}</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        <VideoGrid
          participants={activeParticipants}
          localVideoTrack={localVideoTrack}
          remoteUsers={remoteUsers}
          localParticipantId={currentUserId}
        />
        <AnimatePresence>
          {sidePanel && (
            <SidePanel
              activeTab={sidePanel}
              participants={activeParticipants}
              messages={session.chat}
              onClose={() => setSidePanel(null)}
              onSendMessage={(text) => onSendMessage(text)}
              onTabChange={(tab) => {
                setSidePanel(tab);
                if (tab === "chat") setUnread(0);
              }}
              isInstructor={isInstructor}
              pinnedMessageId={session.pinnedMessageId}
              chatMuted={session.chatMuted}
              onPinMessage={onPinMessage}
              currentUserId={currentUserId}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar */}
      <ControlBar
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        handRaised={handRaised}
        isInstructor={isInstructor}
        participantCount={activeParticipants.length}
        unreadMessages={unread}
        activeSidePanel={sidePanel}
        chatMuted={session.chatMuted}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onToggleScreen={() => setIsScreenSharing(!isScreenSharing)}
        onToggleHand={handleToggleHand}
        onTogglePanel={togglePanel}
        onSendReaction={(reaction) => onSendReaction?.(reaction)}
        onToggleChatMute={isInstructor ? onToggleChatMute : undefined}
        onLeave={handleLeave}
        onMuteAll={isInstructor ? handleMuteAll : undefined}
        mutesLocked={session.mutesLocked}
        onReleaseMutes={isInstructor ? onReleaseMutes : undefined}
      />
    </div>
  );
}
