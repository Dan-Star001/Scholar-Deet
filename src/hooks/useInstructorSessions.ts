import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { db, isFirebaseConfigured } from "@/utils/firebase";
import type { Session, Participant, ChatMessage, SessionStatus } from "@/hooks/useSession";

export interface SessionSummary {
  id: string;
  name: string;
  status: SessionStatus;
  createdAt: number;
  endedAt?: number;
  participantCount: number;
  messageCount: number;
  participants: (Participant & { leftAt?: number })[];
  chat: ChatMessage[];
}

export function useInstructorSessions(uid: string | undefined) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !isFirebaseConfigured || !db) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const sessionsRef = ref(db, "sessions");
    const handler = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const result: SessionSummary[] = [];
      for (const [id, val] of Object.entries(data) as any[]) {
        if (val.instructorUid === uid) {
          const participants: Participant[] = val.participants
            ? Object.values(val.participants)
            : [];
          const chatEntries = val.chat ? Object.values(val.chat) : [];
          result.push({
            id,
            name: val.name || `Class ${id}`,
            status: val.status || "active",
            createdAt: val.createdAt || 0,
            endedAt: val.endedAt,
            participantCount: participants.length,
            messageCount: chatEntries.length,
            participants,
            chat: chatEntries as ChatMessage[],
          });
        }
      }

      result.sort((a, b) => b.createdAt - a.createdAt);
      setSessions(result);
      setLoading(false);
    });

    return () => off(sessionsRef, "value", handler);
  }, [uid]);

  return { sessions, loading };
}
