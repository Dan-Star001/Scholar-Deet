import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, Home, MessageSquare, Users, Clock, CheckCircle } from "lucide-react";
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md text-center space-y-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/20 backdrop-blur-sm">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">
            {type === "ended" 
              ? (sessionName ? `${sessionName} has ended` : "Class has ended") 
              : "You left the class"}
          </h1>
        </div>

        <div className="flex justify-center py-2">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Clock className="h-6 w-6 text-white/80" />
            </div>
            <p className="text-lg font-semibold text-white">{duration}</p>
            <p className="text-xs text-white/60">Duration</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {(isInstructor || type === "left") && (
            <Button
              onClick={handleBack}
              className="h-11 px-6 rounded-xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm font-medium border border-white/10"
            >
              <Home className="h-4 w-4 mr-2" />
              {isInstructor ? "Back to Dashboard" : "Back to Home"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
