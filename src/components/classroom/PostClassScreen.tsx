import { Button, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { 
  Logout, 
  Home as HomeIcon, 
  Chat as ChatIcon, 
  Groups as GroupsIcon, 
  AccessTime as AccessTimeIcon, 
  CheckCircle as CheckCircleIcon 
} from "@mui/icons-material";
import type { ChatMessage, Participant } from "@/hooks/useSession";
import classEndedBg from "@/assets/class-ended-bg.jpg";

interface PostClassScreenProps {
  sessionId: string;
  sessionName?: string;
  duration: string;
  isInstructor?: boolean;
  onBackToDashboard?: () => void;
  type?: "ended" | "left";
  chat?: ChatMessage[];
  participants?: Participant[];
}

export function PostClassScreen({
  sessionId,
  sessionName,
  duration,
  isInstructor = false,
  onBackToDashboard,
  type = "ended",
  chat = [],
  participants = [],
}: PostClassScreenProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      navigate("/");
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6 relative"
      style={{
        backgroundImage: `url(${classEndedBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div className="relative z-10 w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/20 backdrop-blur-md">
          <CheckCircleIcon className="h-10 w-10 text-success" />
        </div>

        <div className="space-y-2">
          <Typography variant="h4" className="font-extrabold text-white tracking-tight">
            {type === "ended" 
              ? (sessionName ? `${sessionName}` : "Class has ended") 
              : "Session Left"}
          </Typography>
          <Typography variant="body1" className="text-white/80 font-medium">
            {type === "ended" ? "The session has been concluded" : "You have left the session"}
          </Typography>
        </div>

        <div className="flex justify-center py-2">
          <div className="flex flex-col items-center gap-1 p-4 min-w-[140px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 mb-1">
              <AccessTimeIcon className="h-5 w-5 text-white" />
            </div>
            <Typography variant="h5" className="font-black text-white">{duration}</Typography>
            <Typography variant="caption" className="text-white/60 font-bold uppercase tracking-widest text-[10px]">Duration</Typography>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4">
          {(isInstructor || type === "left") && (
            <Button
              variant="contained"
              onClick={handleBack}
              className="h-12 px-8 rounded-2xl bg-white text-black hover:bg-white/90 font-bold shadow-2xl normal-case transition-all hover:scale-105 active:scale-95"
              startIcon={<HomeIcon className="h-5 w-5" />}
            >
              {isInstructor ? "Back to Dashboard" : "Back to Home"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
