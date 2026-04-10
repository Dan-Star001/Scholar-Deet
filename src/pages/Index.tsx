import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import { useInstructorSessions } from "@/hooks/useInstructorSessions";
import { AuthForm } from "@/components/classroom/AuthForm";
import { InstructorDashboard } from "@/components/classroom/InstructorDashboard";
import { LiveClassroom } from "@/components/classroom/LiveClassroom";
import { PostClassScreen } from "@/components/classroom/PostClassScreen";

const ACTIVE_SESSION_KEY = "instructor_active_session";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, signup, logout, updateSettings, loading, error, initializing } = useAuth();

  const [savedSession, setSavedSession] = useState(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      return raw ? JSON.parse(raw) as { sessionId: string; participantId: string } : null;
    } catch { return null; }
  });

  const { 
    session, 
    status, 
    elapsed, 
    createSession, 
    endSession, 
    sendMessage, 
    toggleHand, 
    muteAllStudents, 
    updateMuteState, 
    updateParticipantAgoraUid,
    pinMessage,
    toggleChatMute,
    sendReaction,
    updateNetworkQuality,
    releaseMutes
  } = useSession(savedSession?.sessionId);
  const { sessions, loading: sessionsLoading } = useInstructorSessions(user?.uid);
  const [currentUserId, setCurrentUserId] = useState<string>(savedSession?.participantId ?? "");

  useEffect(() => {
    if (status === "ended") {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [status]);

  const handleStartClass = (className: string) => {
    if (!user) return;
    const { sessionId, participantId } = createSession(user.displayName, user.uid, className);
    setCurrentUserId(participantId);
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ sessionId, participantId }));
    setSavedSession({ sessionId, participantId });
  };

  const handleBackToDashboard = () => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    setSavedSession(null);
  };

  if (loading || initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/scholar-deet-logo.png" alt="Scholar Deet" className="h-56 w-56 animate-pulse" />
        </div>
      </div>
    );
  }

  if (status === "ended" && session) {
    return (
      <PostClassScreen
        sessionId={session.id}
        sessionName={session.name}
        duration={formatTime(elapsed)}
        isInstructor={true}
        onBackToDashboard={handleBackToDashboard}
        type="ended"
        chat={session.chat}
        participants={session.participants}
      />
    );
  }

  if (status === "active" && session) {
    return (
      <LiveClassroom
        session={session}
        currentUserId={currentUserId}
        isInstructor={true}
        elapsed={elapsed}
        onEndSession={() => { localStorage.removeItem(ACTIVE_SESSION_KEY); endSession(); }}
        onSendMessage={(text) =>
          sendMessage(currentUserId, user?.displayName ?? "Instructor", text)
        }
        onToggleHand={() => toggleHand(currentUserId)}
        onMuteAll={muteAllStudents}
        onUpdateMuteState={updateMuteState}
        onUpdateParticipantAgoraUid={updateParticipantAgoraUid}
        onUpdateNetworkQuality={updateNetworkQuality}
        onPinMessage={pinMessage}
        onToggleChatMute={toggleChatMute}
        onSendReaction={(emoji) => sendReaction(currentUserId, emoji)}
        onReleaseMutes={releaseMutes}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-background bg-dot-pattern">
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <img 
              src="/login-bg.png" 
              alt="Background" 
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/90 mix-blend-multiply" />
          </div>
          
          <div className="relative z-10 max-w-md space-y-6">
            <h1 className="text-6xl font-black text-primary-foreground leading-tight tracking-tight">
              Scholar Deet
            </h1>
            <p className="text-xl text-primary-foreground/90 leading-relaxed font-medium">
              Create and manage live classes with real-time video, chat, and interactive tools. Built for focused learning.
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden text-center pb-2">
            <h1 className="text-4xl font-black text-primary tracking-tight">Scholar Deet</h1>
          </div>
            <div className="space-y-5">
              <div className="text-center space-y-1">
                {/* Auth form will render its own header with logo and Sign In/Up text */}
              </div>
              <AuthForm onLogin={login} onSignup={signup} loading={loading} error={error} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InstructorDashboard
      user={user!}
      sessions={sessions}
      sessionsLoading={sessionsLoading}
      onStartClass={handleStartClass}
      onLogout={logout}
      onUpdateSettings={updateSettings}
    />
  );
};

export default Index;
