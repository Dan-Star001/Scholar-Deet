import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Mic, MicOff, Video, VideoOff, Play, User, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface PreJoinScreenProps {
  sessionId: string;
  onJoin: (name: string, isMuted: boolean, isVideoOn: boolean) => void;
}

export function PreJoinScreen({ sessionId, onJoin }: PreJoinScreenProps) {
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
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center rounded-xl bg-muted hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-xl space-y-6 relative z-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Ready to join?</h1>
          <p className="text-sm text-muted-foreground">
            Session <span className="font-mono font-medium text-foreground">{sessionId}</span>
          </p>
        </div>

        {/* Video Preview - Google Meet style */}
        <div className="relative aspect-video w-full rounded-2xl bg-foreground/5 overflow-hidden shadow-lg">
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
                <User className="h-10 w-10 sm:h-12 sm:w-12 text-primary/60" />
              </div>
            </div>
          )}

          {/* Floating controls over preview */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isMuted
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-foreground/80 text-background hover:bg-foreground/90"
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <button
              type="button"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                !isVideoOn
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-foreground/80 text-background hover:bg-foreground/90"
              }`}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Name + Join */}
        <div className="space-y-3">
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && onJoin(name, isMuted, isVideoOn)}
            className="h-12 text-center text-base rounded-xl border-border bg-secondary/50 focus:bg-background"
          />
          <Button
            onClick={() => onJoin(name, isMuted, isVideoOn)}
            disabled={!name.trim()}
            className="w-full h-12 text-base font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-md"
          >
            Join now
          </Button>
        </div>
      </div>
    </div>
  );
}
