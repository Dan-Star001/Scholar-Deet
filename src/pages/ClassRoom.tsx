import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { PreJoinScreen } from "@/components/classroom/PreJoinScreen";
import { LiveClassroom } from "@/components/classroom/LiveClassroom";
import { PostClassScreen } from "@/components/classroom/PostClassScreen";

const STUDENT_SESSION_KEY = "student_session";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const ClassRoom = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  // Restore student session from sessionStorage so reload keeps them in class
  const [savedStudent] = useState(() => {
    try {
      const raw = sessionStorage.getItem(`${STUDENT_SESSION_KEY}_${sessionId}`);
      return raw
        ? (JSON.parse(raw) as { participantId: string; name: string; isMuted: boolean; isVideoOn: boolean })
        : null;
    } catch { return null; }
  });

  const { 
    session, 
    status, 
    elapsed, 
    joinSession, 
    leaveSession, 
    endSession, 
    sendMessage, 
    toggleHand, 
    updateMuteState, 
    updateParticipantAgoraUid,
    updateNetworkQuality,
    sendReaction
  } = useSession(sessionId);

  const [currentUserId, setCurrentUserId] = useState<string>(savedStudent?.participantId ?? "");
  const [displayName, setDisplayName] = useState(savedStudent?.name ?? "");
  const [initialMuted, setInitialMuted] = useState(savedStudent?.isMuted ?? true);
  const [initialVideoOn, setInitialVideoOn] = useState(savedStudent?.isVideoOn ?? false);
  const [hasJoined, setHasJoined] = useState(!!savedStudent);
  const [leftInfo, setLeftInfo] = useState<{ duration: string; name: string } | null>(null);

  // On reload with saved session, re-register presence in Firebase
  useEffect(() => {
    if (savedStudent && sessionId && !currentUserId) {
      const id = joinSession(savedStudent.name, savedStudent.isMuted, savedStudent.isVideoOn);
      if (id) setCurrentUserId(id);
    }
  }, []);

  const handleJoin = (name: string, isMuted: boolean, isVideoOn: boolean) => {
    setDisplayName(name);
    setInitialMuted(isMuted);
    setInitialVideoOn(isVideoOn);
    const id = joinSession(name, isMuted, isVideoOn);
    if (id) {
      setCurrentUserId(id);
      // Persist to sessionStorage so the student survives a reload
      sessionStorage.setItem(
        `${STUDENT_SESSION_KEY}_${sessionId}`,
        JSON.stringify({ participantId: id, name, isMuted, isVideoOn })
      );
      setHasJoined(true);
    }
  };

  const handleLeave = () => {
    if (currentUserId) {
      leaveSession(currentUserId);
      setLeftInfo({
        duration: formatTime(elapsed),
        name: session?.name || "Class",
      });
    }
    sessionStorage.removeItem(`${STUDENT_SESSION_KEY}_${sessionId}`);
    setHasJoined(false);
  };

  if (status === "ended" && session) {
    return (
      <PostClassScreen
        sessionId={session.id}
        sessionName={session.name}
        duration={formatTime(elapsed)}
        isInstructor={false}
        type="ended"
        chat={session.chat}
        participants={session.participants}
      />
    );
  }

  if (leftInfo) {
    return (
      <PostClassScreen
        sessionId={sessionId ?? ""}
        sessionName={leftInfo.name}
        duration={leftInfo.duration}
        isInstructor={false}
        type="left"
        chat={session?.chat}
        participants={session?.participants}
      />
    );
  }

  if ((status === "active" || hasJoined) && session && currentUserId) {
    return (
      <LiveClassroom
        session={session}
        currentUserId={currentUserId}
        isInstructor={false}
        elapsed={elapsed}
        onEndSession={handleLeave}
        onSendMessage={(text) => sendMessage(currentUserId, displayName, text)}
        onToggleHand={() => toggleHand(currentUserId)}
        onUpdateMuteState={updateMuteState}
        onUpdateParticipantAgoraUid={updateParticipantAgoraUid}
        onUpdateNetworkQuality={updateNetworkQuality}
        onSendReaction={(emoji) => sendReaction(currentUserId, emoji)}
        initialMuted={initialMuted}
        initialVideoOn={initialVideoOn}
      />
    );
  }

  return <PreJoinScreen sessionId={sessionId ?? ""} onJoin={handleJoin} />;
};

export default ClassRoom;
