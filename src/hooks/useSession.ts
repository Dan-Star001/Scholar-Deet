import { useState, useCallback, useEffect, useRef } from "react";
import { ref, set, get, onValue, push, update, off } from "firebase/database";
import { db, isFirebaseConfigured } from "@/utils/firebase";
import { sanitizeText } from "@/utils/profanityFilter";

export type SessionStatus = "idle" | "active" | "ended";

export interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOn: boolean;
  handRaised: boolean;
  isInstructor: boolean;
  joinedAt: number;
  leftAt?: number;
  agoraUid?: number;
  networkQuality?: number;
  lastReaction?: {
    emoji: string;
    timestamp: number;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  createdAt: number;
  participants: Participant[];
  chat: ChatMessage[];
  chatMuted?: boolean;
  pinnedMessageId?: string | null;
  mutesLocked?: boolean;
}

export function useSession(sessionId?: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const lastMessageTime = useRef<number>(0);

  useEffect(() => {
    if (status === "active" && sessionStartTime) {
      setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status, sessionStartTime]);

  useEffect(() => {
    if (!sessionId || !isFirebaseConfigured || !db) {
      setSession(null);
      setStatus("idle");
      setElapsed(0);
      setSessionStartTime(null);
      return;
    }
    const sessionRef = ref(db, `sessions/${sessionId}`);
    const handler = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const participants: Participant[] = data.participants
        ? Object.values(data.participants)
        : [];
      const chat: ChatMessage[] = data.chat
        ? Object.entries(data.chat).map(([key, val]: any) => ({ ...val, id: key }))
        : [];

      const s: Session = {
        id: sessionId,
        name: data.name || `Class ${sessionId}`,
        status: data.status || "active",
        createdAt: data.createdAt || Date.now(),
        participants,
        chat,
        chatMuted: data.chatMuted || false,
        pinnedMessageId: data.pinnedMessageId || null,
        mutesLocked: data.mutesLocked || false,
      };
      setSession(s);
      setSessionStartTime(s.createdAt);

      if (data.status === "ended" && status !== "ended") {
        setStatus("ended");
        clearInterval(timerRef.current);
      } else if (data.status === "active" && status === "idle") {
        setStatus("active");
      }
    });
    return () => off(sessionRef, "value", handler);
  }, [sessionId]);

  const createSession = useCallback(
    (instructorName: string, instructorUid: string, className?: string) => {
      const id = Math.random().toString(36).substring(2, 8).toUpperCase();
      const participantId = crypto.randomUUID();
      const now = Date.now();
      const participant: Participant = {
        id: participantId,
        name: instructorName,
        isMuted: false,
        isVideoOn: true,
        handRaised: false,
        isInstructor: true,
        joinedAt: now,
      };

      const sessionData = {
        name: className || `Class ${id}`,
        status: "active" as SessionStatus,
        createdAt: now,
        instructorUid,
        participants: { [participantId]: participant },
        chat: {},
        chatMuted: false,
        pinnedMessageId: null,
      };

      if (isFirebaseConfigured && db) {
        set(ref(db, `sessions/${id}`), sessionData);
      }

      setSession({
        id,
        name: sessionData.name,
        status: sessionData.status,
        createdAt: sessionData.createdAt,
        participants: [participant],
        chat: [],
        chatMuted: false,
        pinnedMessageId: null,
        mutesLocked: false,
      });
      setSessionStartTime(now);
      setStatus("active");
      return { sessionId: id, participantId };
    },
    []
  );

  const joinSession = useCallback(
    async (name: string, isMuted: boolean = true, isVideoOn: boolean = false): Promise<string | "capacity_exceeded"> => {
      if (!sessionId) return "capacity_exceeded";

      // ── Capacity Check ──────────────────────────────────────────
      if (isFirebaseConfigured && db) {
        try {
          const sessionSnap = await get(ref(db, `sessions/${sessionId}`));
          const sessionData = sessionSnap.val();

          if (sessionData) {
            const instructorUid: string | undefined = sessionData.instructorUid;

            if (instructorUid) {
              const instrSnap = await get(ref(db, `instructors/${instructorUid}`));
              const instrData = instrSnap.val();
              const maxStudents: number = instrData?.totalStudents ?? 0;

              if (maxStudents > 0) {
                // Count active (non-instructor, not left) participants
                const participants: any[] = sessionData.participants
                  ? Object.values(sessionData.participants)
                  : [];
                const activeStudents = participants.filter(
                  (p: any) => !p.isInstructor && !p.leftAt
                ).length;

                if (activeStudents >= maxStudents) {
                  return "capacity_exceeded";
                }
              }
            }
          }
        } catch {
          // If check fails, allow join (non-blocking)
        }
      }
      // ─────────────────────────────────────────────────────────────

      const participantId = crypto.randomUUID();
      const participant: Participant = {
        id: participantId,
        name,
        isMuted,
        isVideoOn,
        handRaised: false,
        isInstructor: false,
        joinedAt: Date.now(),
      };

      if (isFirebaseConfigured && db) {
        set(ref(db, `sessions/${sessionId}/participants/${participantId}`), participant);
      }
      setStatus("active");
      return participantId;
    },
    [sessionId]
  );

  const leaveSession = useCallback(
    (participantId: string) => {
      const sid = sessionId || session?.id;
      if (!sid || !isFirebaseConfigured || !db) return;
      update(ref(db, `sessions/${sid}/participants/${participantId}`), {
        leftAt: Date.now(),
      });
    },
    [sessionId, session?.id]
  );

  const endSession = useCallback(() => {
    const sid = sessionId || session?.id;
    if (sid && isFirebaseConfigured && db) {
      update(ref(db, `sessions/${sid}`), { status: "ended", endedAt: Date.now() });
    }
    setStatus("ended");
    clearInterval(timerRef.current);
  }, [sessionId, session?.id]);

  const sendMessage = useCallback(
    (senderId: string, senderName: string, text: string) => {
      const sid = sessionId || session?.id;
      if (!sid || !isFirebaseConfigured || !db) return;

      // Strict Lock Check: Students cannot send if chat is muted
      const sender = session?.participants.find(p => p.id === senderId);
      const isInstructor = sender?.isInstructor ?? false;
      if (session?.chatMuted && !isInstructor) return;

      // Rate limiting (1 second)
      const now = Date.now();
      if (now - lastMessageTime.current < 1000) return;
      lastMessageTime.current = now;

      const sanitized = sanitizeText(text);

      const chatRef = ref(db, `sessions/${sid}/chat`);
      push(chatRef, {
        senderId,
        senderName,
        text: sanitized,
        timestamp: now,
      });
    },
    [sessionId, session?.id]
  );

  const toggleHand = useCallback(
    (participantId: string) => {
      const sid = sessionId || session?.id;
      if (!sid || !isFirebaseConfigured || !db) return;
      const current = session?.participants.find((p) => p.id === participantId);
      if (current) {
        update(ref(db, `sessions/${sid}/participants/${participantId}`), {
          handRaised: !current.handRaised,
        });
      }
    },
    [sessionId, session]
  );

  const muteAllStudents = useCallback(() => {
    const sid = sessionId || session?.id;
    if (!sid || !isFirebaseConfigured || !db || !session) return;
    const updates: Record<string, any> = {};
    session.participants.forEach((p) => {
      if (!p.isInstructor) {
        updates[`sessions/${sid}/participants/${p.id}/isMuted`] = true;
      }
    });
    // Lock mutes
    updates[`sessions/${sid}/mutesLocked`] = true;
    update(ref(db), updates);
  }, [sessionId, session]);

  const releaseMutes = useCallback(() => {
    const sid = sessionId || session?.id;
    if (!sid || !isFirebaseConfigured || !db) return;
    update(ref(db, `sessions/${sid}`), { mutesLocked: false });
  }, [sessionId, session?.id]);

  const updateParticipantAgoraUid = useCallback(
    (participantId: string, agoraUid: number) => {
      const sid = sessionId || session?.id;
      if (!sid || !isFirebaseConfigured || !db) return;
      update(ref(db, `sessions/${sid}/participants/${participantId}`), { agoraUid });
    },
    [sessionId, session?.id]
  );

  const toggleChatMute = useCallback(() => {
    const sid = sessionId || session?.id;
    if (!sid || !isFirebaseConfigured || !db) return;
    const currentMuteState = session?.chatMuted ?? false;
    update(ref(db, `sessions/${sid}`), { chatMuted: !currentMuteState });
  }, [sessionId, session?.id, session?.chatMuted]);

  const pinMessage = useCallback((messageId: string | null) => {
    const sid = sessionId || session?.id;
    if (!sid || !isFirebaseConfigured || !db) return;
    update(ref(db, `sessions/${sid}`), { pinnedMessageId: messageId });
  }, [sessionId, session?.id]);

  const sendReaction = useCallback((participantId: string, emoji: string) => {
    const sid = sessionId || session?.id;
    if (!sid || !isFirebaseConfigured || !db) return;
    update(ref(db, `sessions/${sid}/participants/${participantId}`), {
      lastReaction: { emoji, timestamp: Date.now() },
    });
  }, [sessionId, session?.id]);

  const updateNetworkQuality = useCallback((participantId: string, quality: number) => {
    const sid = sessionId || session?.id;
    if (!sid || !isFirebaseConfigured || !db) return;
    update(ref(db, `sessions/${sid}/participants/${participantId}`), { networkQuality: quality });
  }, [sessionId, session?.id]);

  const updateMuteState = useCallback(
    (participantId: string, isMuted: boolean) => {
      const sid = sessionId || session?.id;
      if (!sid || !isFirebaseConfigured || !db) return;
      update(ref(db, `sessions/${sid}/participants/${participantId}`), { isMuted });
    },
    [sessionId, session?.id]
  );

  return {
    session,
    status,
    elapsed,
    createSession,
    joinSession,
    leaveSession,
    endSession,
    sendMessage,
    toggleHand,
    muteAllStudents,
    updateMuteState,
    updateParticipantAgoraUid,
    toggleChatMute,
    pinMessage,
    sendReaction,
    updateNetworkQuality,
    releaseMutes,
  };
}
