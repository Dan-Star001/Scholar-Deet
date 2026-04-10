import { useState, useEffect, useRef } from "react";
import type { Participant } from "@/hooks/useSession";
import type { ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import type { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { 
  Mic, 
  MicOff, 
  Wifi, 
  WifiOff, 
  ChevronLeft, 
  ChevronRight,
  Hand
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoGridProps {
  participants: Participant[];
  localVideoTrack?: ICameraVideoTrack | null;
  remoteUsers?: IAgoraRTCRemoteUser[];
  localParticipantId?: string;
}

function VideoTile({
  participant,
  videoTrack,
  audioTrack,
}: {
  participant: Participant;
  videoTrack?: ICameraVideoTrack;
  audioTrack?: IMicrophoneAudioTrack;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Video playback
  useEffect(() => {
    if (videoTrack && containerRef.current) {
      videoTrack.play(containerRef.current);
      return () => {
        videoTrack.stop();
      };
    }
  }, [videoTrack]);

  // Audio playback - crucial for remote users
  useEffect(() => {
    if (audioTrack) {
      const playAudio = async () => {
        try {
          await audioTrack.play();
        } catch (e) {
          // Silent catch
        }
      };
      playAudio();
      return () => {
        audioTrack.stop();
      };
    }
  }, [audioTrack]);

  const initials = participant.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [activeReactions, setActiveReactions] = useState<{ id: number; emoji: string; xOffset: number }[]>([]);
  const reactionRef = useRef(participant.lastReaction?.timestamp);

  useEffect(() => {
    if (participant.lastReaction && participant.lastReaction.timestamp !== reactionRef.current) {
      reactionRef.current = participant.lastReaction.timestamp;
      
      const newId = Date.now();
      const xOffset = (Math.random() - 0.5) * 60; // Random jitter between -30 and 30
      
      setActiveReactions(prev => [...prev, { id: newId, emoji: participant.lastReaction!.emoji, xOffset }]);
      
      // Auto-cleanup after animation duration
      setTimeout(() => {
        setActiveReactions(prev => prev.filter(r => r.id !== newId));
      }, 3000);
    }
  }, [participant.lastReaction]);

  const renderNetworkIcon = () => {
    const q = participant.networkQuality ?? 0;
    if (q === 0 || q === 7 || q === 8) return <WifiOff className="h-2.5 w-2.5 text-muted-foreground/50" />;
    if (q <= 2) return <Wifi className="h-2.5 w-2.5 text-success" />;
    if (q <= 4) return <Wifi className="h-3 w-3 text-warning" />;
    return <WifiOff className="h-3 w-3 text-destructive" />;
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-foreground/5 overflow-hidden transition-shadow ${
        participant.handRaised ? "ring-2 ring-warning shadow-lg" : ""
      }`}
    >
      {videoTrack ? (
        <div ref={containerRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/15">
            <span className="text-xl sm:text-2xl font-semibold text-primary/70">{initials}</span>
          </div>
        </div>
      )}

      {/* Name pill */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-foreground/60 backdrop-blur-sm px-2.5 py-1">
        {participant.isMuted ? (
          <MicOff className="h-2.5 w-2.5 text-destructive-foreground" />
        ) : (
          <Mic className="h-2.5 w-2.5 text-background" />
        )}
        <span className="text-xs font-medium text-background truncate max-w-[124px]">
          {participant.name}
          {participant.isInstructor && " (Host)"}
        </span>
        <div className="ml-1 border-l border-background/20 pl-1.5">
          {renderNetworkIcon()}
        </div>
      </div>

      {/* Reactions Burst */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {activeReactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ scale: 0.5, y: 150, opacity: 0 }}
              animate={{ 
                scale: [0.5, 1.2, 1], 
                y: -150, 
                opacity: [0, 1, 1, 0],
                x: reaction.xOffset,
                rotate: reaction.xOffset * 0.5
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute z-20 text-5xl drop-shadow-2xl"
            >
              {reaction.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getGridLayout(count: number, containerWidth: number) {
  if (containerWidth < 500) {
    return { cols: count <= 1 ? 1 : 2, perPage: 4 };
  }
  if (count <= 1) return { cols: 1, perPage: 1 };
  if (count <= 4) return { cols: 2, perPage: 4 };
  if (count <= 9) return { cols: 3, perPage: 9 };
  return { cols: 4, perPage: 16 };
}

export function VideoGrid({
  participants,
  localVideoTrack,
  remoteUsers = [],
  localParticipantId,
}: VideoGridProps) {
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const { cols, perPage } = getGridLayout(participants.length, containerWidth);
  const totalPages = Math.ceil(participants.length / perPage);
  const startIdx = page * perPage;
  const visibleParticipants = participants.slice(startIdx, startIdx + perPage);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) setPage(totalPages - 1);
  }, [totalPages, page]);

  return (
    <div ref={containerRef} className="relative flex-1 p-2 sm:p-3 flex flex-col min-h-0 bg-muted/20">
      <div
        className="flex-1 grid gap-2 auto-rows-fr"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {visibleParticipants.map((p) => {
          let videoTrack: any = undefined;
          let audioTrack: any = undefined;

          if (p.id === localParticipantId) {
            videoTrack = localVideoTrack;
          } else {
            // Priority 1: Match by the agoraUid synced to Firebase
            // Priority 2: Match by participant ID if it happens to be numeric (fallback)
            const remote = remoteUsers.find((u) => 
               u.uid === p.agoraUid || String(u.uid) === p.id
            );
            videoTrack = remote?.videoTrack;
            audioTrack = remote?.audioTrack;
          }

          return (
            <VideoTile 
              key={p.id} 
              participant={p} 
              videoTrack={videoTrack} 
              audioTrack={audioTrack}
            />
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 h-10">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="h-8 w-8 rounded-full flex items-center justify-center bg-muted hover:bg-muted-foreground/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === page ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="h-8 w-8 rounded-full flex items-center justify-center bg-muted hover:bg-muted-foreground/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
