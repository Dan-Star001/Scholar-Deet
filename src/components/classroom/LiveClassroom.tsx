import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ControlBar } from "./ControlBar";
import { SidePanel } from "./SidePanel";
import { VideoGrid } from "./VideoGrid";
import { Clock, Link2, Check, Sun, Moon } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import type { Session } from "@/hooks/useSession";
import { useAgora } from "@/hooks/useAgora";
import { AGORA_APP_ID } from "@/utils/agora";
import { toast } from "sonner";

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
    // Only increment if there are actually messages and the panel is closed
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
    // Sync to Firebase so mic icon updates on all cards
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
    onEndSession(); // This will handle the page-specific leave logic
  };

  const activeParticipants = session.participants.filter(p => !p.leftAt);
  const currentUser = session.participants.find(p => p.id === currentUserId);

  // Mention Notifications
  const lastMsgCount = useRef(session.chat.length);
  useEffect(() => {
    if (session.chat.length > lastMsgCount.current) {
      const lastMsg = session.chat[session.chat.length - 1];
      // If someone else mentioned me
      if (lastMsg.senderId !== currentUserId && currentUser) {
        if (lastMsg.text.includes(`@${currentUser.name}`)) {
          toast.info(`${lastMsg.senderName} mentioned you in chat`, {
            description: lastMsg.text.length > 50 ? lastMsg.text.slice(0, 50) + "..." : lastMsg.text,
            action: {
              label: "View",
              onClick: () => {
                if (sidePanel !== "chat") togglePanel("chat");
              },
            },
          });
        }
      }
    }
    lastMsgCount.current = session.chat.length;
  }, [session.chat.length, currentUser, currentUserId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is on an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        handleToggleMute();
      } else if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleToggleVideo();
      } else if (e.ctrlKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMuted, isVideoOn, joined]); // Add dependencies to ensure handlers use latest state

  useEffect(() => {
    // Sync network quality to Firebase
    if (localUid && localNetworkQuality !== undefined) {
      onUpdateParticipantAgoraUid?.(currentUserId, localUid); // Re-sync UID if needed
      // Map Agora quality (0-8) to something we can store
      // In useSession we added updateNetworkQuality
    }
  }, [localUid, localNetworkQuality]);

  useEffect(() => {
    if (localNetworkQuality !== undefined && joined) {
      onUpdateNetworkQuality?.(currentUserId, localNetworkQuality);
    }
  }, [localNetworkQuality, joined, onUpdateNetworkQuality, currentUserId]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-4 bg-background/40 backdrop-blur-md border-b border-white/5 z-10">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <img src="/scholar-deet-logo.png" alt="Scholar Deet" className="h-24 w-24 shrink-0" />
          <h2 className="text-sm font-semibold text-foreground truncate">{session.name}</h2>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(elapsed)}
          </div>
          <div className="flex sm:hidden items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatTime(elapsed)}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-success font-medium hidden sm:inline">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={copyClassLink}
            className="flex items-center gap-1.5 rounded-lg bg-muted hover:bg-muted-foreground/10 px-2 sm:px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {linkCopied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{linkCopied ? "Copied!" : "Copy link"}</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
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
        onSendReaction={onSendReaction}
        onToggleChatMute={isInstructor ? onToggleChatMute : undefined}
        onLeave={handleLeave}
        onMuteAll={isInstructor ? handleMuteAll : undefined}
        mutesLocked={session.mutesLocked}
        onReleaseMutes={isInstructor ? onReleaseMutes : undefined}
      />
    </div>
  );
}
