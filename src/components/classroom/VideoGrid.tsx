import { useState, useEffect, useRef } from "react";
import type { Participant } from "@/hooks/useSession";
import type { ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import type { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { 
  IconButton, 
  Typography, 
  Box, 
  Avatar, 
  Tooltip 
} from "@mui/material";
import { 
  Mic, 
  MicOff, 
  Wifi, 
  WifiOff, 
  ChevronLeft, 
  ChevronRight,
  PanTool
} from "@mui/icons-material";
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

  // Audio playback
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
      const xOffset = (Math.random() - 0.5) * 80;
      
      setActiveReactions(prev => [...prev, { id: newId, emoji: participant.lastReaction!.emoji, xOffset }]);
      
      setTimeout(() => {
        setActiveReactions(prev => prev.filter(r => r.id !== newId));
      }, 3000);
    }
  }, [participant.lastReaction]);

  const renderNetworkIcon = () => {
    const q = participant.networkQuality ?? 0;
    if (q === 0 || q === 7 || q === 8) return <WifiOff sx={{ fontSize: 10 }} className="text-muted-foreground/50" />;
    if (q <= 2) return <Wifi sx={{ fontSize: 10 }} className="text-success" />;
    if (q <= 4) return <Wifi sx={{ fontSize: 10 }} className="text-warning" />;
    return <WifiOff sx={{ fontSize: 10 }} className="text-destructive" />;
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-muted/40 overflow-hidden transition-all border border-white/5 ${
        participant.handRaised ? "ring-2 ring-secondary shadow-lg shadow-secondary/20" : ""
      }`}
    >
      {videoTrack ? (
        <div ref={containerRef} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/20">
          <Avatar 
            sx={{ 
                width: { xs: 60, sm: 80, md: 100 }, 
                height: { xs: 60, sm: 80, md: 100 }, 
                fontSize: { xs: 24, sm: 32, md: 40 }, 
                bgcolor: 'primary.main',
                fontWeight: 'black',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                color: 'primary.contrastText'
            }}
          >
            {initials}
          </Avatar>
        </div>
      )}

      {/* Name pill */}
      <Box className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10">
        {participant.isMuted ? (
          <MicOff sx={{ fontSize: 12 }} className="text-destructive" />
        ) : (
          <Mic sx={{ fontSize: 12 }} className="text-success" />
        )}
        <Typography variant="caption" className="font-bold text-white truncate max-w-[100px] sm:max-w-[150px]">
          {participant.name}
          {participant.isInstructor && <Typography component="span" variant="caption" className="ml-1 text-primary-light font-black opacity-80">(Host)</Typography>}
        </Typography>
        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'white', opacity: 0.1, mx: 0.5 }} />
        {renderNetworkIcon()}
      </Box>

      {/* Reactions Burst */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {activeReactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ scale: 0.5, y: 150, opacity: 0 }}
              animate={{ 
                scale: [0.5, 1.5, 1], 
                y: -200, 
                opacity: [0, 1, 1, 0],
                x: reaction.xOffset,
                rotate: reaction.xOffset * 0.5
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute z-20 text-6xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]"
            >
              {reaction.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {participant.handRaised && (
          <Box className="absolute top-3 right-3 bg-secondary text-secondary-foreground p-1.5 rounded-xl shadow-lg border border-white/20 animate-bounce">
              <PanTool fontSize="small" />
          </Box>
      )}
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
    <div ref={containerRef} className="relative flex-1 p-3 sm:p-5 flex flex-col min-h-0 bg-transparent">
      <div
        className="flex-1 grid gap-4 auto-rows-fr"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {visibleParticipants.map((p) => {
          let videoTrack: any = undefined;
          let audioTrack: any = undefined;

          if (p.id === localParticipantId) {
            videoTrack = localVideoTrack;
          } else {
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
        <Box className="flex items-center justify-center gap-4 pt-4 h-14">
          <IconButton
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="h-10 w-10 rounded-xl bg-background/50 hover:bg-background border border-white/5 shadow-md disabled:opacity-30 transition-all"
          >
            <ChevronLeft fontSize="small" className="text-foreground" />
          </IconButton>
          
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <Box
                key={i}
                onClick={() => setPage(i)}
                className={`h-2.5 w-2.5 rounded-full cursor-pointer transition-all ${
                  i === page ? "bg-primary scale-125 shadow-[0_0_10px_rgba(43,45,66,0.5)]" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          <IconButton
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="h-10 w-10 rounded-xl bg-background/50 hover:bg-background border border-white/5 shadow-md disabled:opacity-30 transition-all"
          >
            <ChevronRight fontSize="small" className="text-foreground" />
          </IconButton>
        </Box>
      )}
    </div>
  );
}

const Divider = ({ orientation, flexItem, sx }: any) => <Box sx={{ width: orientation === 'vertical' ? '1px' : '100%', height: orientation === 'vertical' ? 'auto' : '1px', alignSelf: flexItem ? 'stretch' : 'auto', ...sx }} />;
