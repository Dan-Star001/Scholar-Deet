import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Hand, 
  VolumeX, 
  Smile, 
  Users, 
  MessageSquare,
  PhoneOff, 
  LogOut,
  Volume2,
  Lock,
  Unlock
} from "lucide-react";

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

  return (
    <div className="flex items-center justify-center px-4 sm:px-8 py-4 glass-premium shadow-2xl z-20 mx-4 mb-4 rounded-2xl">
      <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
        <button
          onClick={onToggleMute}
          disabled={!isInstructor && mutesLocked}
          title={!isInstructor && mutesLocked ? "Mic locked by host" : isMuted ? "Unmute" : "Mute"}
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-foreground hover:bg-muted-foreground/15"
          } ${!isInstructor && mutesLocked ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {/* Video */}
        <button
          onClick={onToggleVideo}
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all ${
            !isVideoOn
              ? "bg-destructive text-destructive-foreground"
              : "bg-muted text-foreground hover:bg-muted-foreground/15"
          }`}
        >
          {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>



        {/* Hand Raise */}
        <button
          onClick={onToggleHand}
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all ${
            handRaised
              ? "bg-warning text-warning-foreground animate-pulse-glow"
              : "bg-muted text-foreground hover:bg-muted-foreground/15"
          }`}
        >
          <Hand className="h-5 w-5" />
        </button>

        {/* Mute All - Instructor only */}
        {onMuteAll && (
          <button
            onClick={onMuteAll}
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all ${
              mutesLocked ? "bg-warning text-warning-foreground" : "bg-muted text-foreground hover:bg-warning/20 hover:text-warning"
            }`}
            title="Mute all students"
          >
            <VolumeX className="h-5 w-5" />
          </button>
        )}

        {/* Release Mics - Instructor only */}
        {isInstructor && mutesLocked && onReleaseMutes && (
          <button
            onClick={onReleaseMutes}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all bg-success/20 text-success hover:bg-success/30"
            title="Release mics"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        )}

        {/* Reactions */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all bg-muted text-foreground hover:bg-muted-foreground/15">
              <Smile className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top" align="center">
            <div className="flex gap-1.5">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSendReaction(emoji)}
                  className="h-9 w-9 flex items-center justify-center text-xl hover:bg-muted rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Roster */}
        <button
          onClick={() => onTogglePanel("roster")}
          className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all ${
            activeSidePanel === "roster"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-foreground hover:bg-muted-foreground/15"
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1">
            {participantCount}
          </span>
        </button>

        {/* Chat Toggle (Instructor only) */}
        {isInstructor && onToggleChatMute && (
          <button
            onClick={onToggleChatMute}
            className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all mx-1.5 z-20 ${
              chatMuted
                ? "bg-[#f59e0b] text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-2 ring-[#f59e0b]/50"
                : "bg-muted text-foreground hover:bg-muted-foreground/15"
            }`}
            title={chatMuted ? "Unlock Chat" : "Lock Chat"}
          >
            {chatMuted ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
          </button>
        )}

        {/* Chat */}
        <button
          onClick={() => onTogglePanel("chat")}
          className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all ${
            activeSidePanel === "chat"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-foreground hover:bg-muted-foreground/15"
          }`}
        >
          <MessageSquare className="h-5 w-5" />
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
              {unreadMessages}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-border mx-1" />

        <button
          onClick={onLeave}
          className="h-10 sm:h-11 rounded-full px-4 sm:px-5 flex items-center gap-1.5 font-medium text-sm transition-all bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isInstructor ? (
            <>
              <PhoneOff className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">End</span>
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Leave</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
