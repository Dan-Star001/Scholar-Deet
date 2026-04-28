import { useState, useEffect, useRef } from "react";
import { Button, TextField, Typography, IconButton, Tooltip, Alert } from "@mui/material";
import { MenuBook, Mic, MicOff, Videocam, VideocamOff, Person, LightMode, DarkMode } from "@mui/icons-material";
import { useTheme } from "next-themes";

interface PreJoinScreenProps {
  sessionId: string;
  onJoin: (name: string, isMuted: boolean, isVideoOn: boolean) => void;
  error?: string | null;
}

export function PreJoinScreen({ sessionId, onJoin, error }: PreJoinScreenProps) {
  const [name, setName] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const { theme, setTheme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isVideoOn) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => setIsVideoOn(false));
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isVideoOn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden">
      {/* Theme Toggle */}
      <IconButton
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center rounded-xl bg-muted hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        {theme === "dark" ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
      </IconButton>

      <div className="w-full max-w-xl space-y-6 relative z-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <MenuBook fontSize="small" className="text-primary" />
          </div>
          <Typography variant="h5" className="font-bold text-foreground">Ready to join?</Typography>
          <Typography variant="body2" className="text-muted-foreground">
            Session <span className="font-mono font-medium text-foreground">{sessionId}</span>
          </Typography>
        </div>

        {/* Video Preview - Google Meet style */}
        <div className="relative aspect-video w-full rounded-2xl bg-foreground/5 overflow-hidden shadow-lg border border-border/50">
          {isVideoOn ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/60">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-primary/10">
                <Person className="h-10 w-10 sm:h-12 sm:w-12 text-primary/60" />
              </div>
            </div>
          )}

          {/* Floating controls over preview */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <Tooltip title={isMuted ? "Unmute" : "Mute"}>
              <IconButton
                onClick={() => setIsMuted(!isMuted)}
                className={`h-12 w-12 rounded-full shadow-lg ${
                  isMuted
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-background/80 text-foreground hover:bg-background/90"
                }`}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </IconButton>
            </Tooltip>
            <Tooltip title={isVideoOn ? "Turn off camera" : "Turn on camera"}>
              <IconButton
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`h-12 w-12 rounded-full shadow-lg ${
                  !isVideoOn
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-background/80 text-foreground hover:bg-background/90"
                }`}
              >
                {isVideoOn ? <Videocam /> : <VideocamOff />}
              </IconButton>
            </Tooltip>
          </div>
        </div>

          {/* Name + Join */}
        <div className="space-y-4">
          {error && (
            <Alert severity="error" className="rounded-xl">
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name, isMuted, isVideoOn)}
            variant="outlined"
            slotProps={{
              input: {
                className: "rounded-xl text-center text-lg h-14 bg-secondary/30",
              }
            }}
          />
          <Button
            variant="contained"
            fullWidth
            onClick={() => onJoin(name, isMuted, isVideoOn)}
            disabled={!name.trim()}
            className="h-14 text-lg font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-lg normal-case"
          >
            Join now
          </Button>
        </div>
      </div>
    </div>
  );
}
