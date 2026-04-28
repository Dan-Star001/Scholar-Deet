import { useState, useCallback, useEffect } from "react";
import { ref, onValue, push, remove, off } from "firebase/database";
import { db, isFirebaseConfigured } from "@/utils/firebase";

export interface Student {
  id: string;       // Firebase push key
  name: string;
  matricNo: string;
  addedAt: number;
}

export function useStudentRoster(instructorUid: string | undefined) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Live-sync roster from Firebase
  useEffect(() => {
    if (!instructorUid || !isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }

    const rosterRef = ref(db, `instructors/${instructorUid}/students`);
    setLoading(true);

    const handler = onValue(rosterRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setStudents([]);
      } else {
        const list: Student[] = Object.entries(data).map(([key, val]: any) => ({
          id: key,
          name: val.name ?? "",
          matricNo: val.matricNo ?? "",
          addedAt: val.addedAt ?? 0,
        }));
        // Sort by addedAt ascending
        list.sort((a, b) => a.addedAt - b.addedAt);
        setStudents(list);
      }
      setLoading(false);
    });

    return () => off(rosterRef, "value", handler);
  }, [instructorUid]);

  /**
   * Add a single student.
   * Returns false only if Firebase is unavailable — capacity check is UI-only,
   * the function always attempts the write.
   */
  const addStudent = useCallback(
    async (name: string, matricNo: string): Promise<boolean> => {
      if (!instructorUid || !isFirebaseConfigured || !db) return false;
      const rosterRef = ref(db, `instructors/${instructorUid}/students`);
      await push(rosterRef, {
        name: name.trim(),
        matricNo: matricNo.trim(),
        addedAt: Date.now(),
      });
      return true;
    },
    [instructorUid]
  );

  /**
   * Bulk-add students from a file import.
   * NO capacity cap — imports ALL entries found in the file.
   * Skips entries with empty names.
   * Returns { added, skipped } counts.
   */
  const addStudentsBulk = useCallback(
    async (
      entries: { name: string; matricNo: string }[]
    ): Promise<{ added: number; skipped: number }> => {
      if (!instructorUid || !isFirebaseConfigured || !db) {
        return { added: 0, skipped: entries.length };
      }

      const valid = entries.filter((e) => e.name.trim().length > 0);
      const skipped = entries.length - valid.length;

      if (valid.length === 0) return { added: 0, skipped };

      const rosterRef = ref(db, `instructors/${instructorUid}/students`);
      const now = Date.now();

      for (let i = 0; i < valid.length; i++) {
        await push(rosterRef, {
          name: valid[i].name.trim(),
          matricNo: valid[i].matricNo.trim(),
          addedAt: now + i, // unique timestamps for deterministic ordering
        });
      }

      return { added: valid.length, skipped };
    },
    [instructorUid]
  );

  /** Remove a single student by Firebase key. */
  const removeStudent = useCallback(
    async (studentId: string): Promise<void> => {
      if (!instructorUid || !isFirebaseConfigured || !db) return;
      await remove(ref(db, `instructors/${instructorUid}/students/${studentId}`));
    },
    [instructorUid]
  );

  /** Clear entire roster. */
  const clearRoster = useCallback(
    async (): Promise<void> => {
      if (!instructorUid || !isFirebaseConfigured || !db) return;
      await remove(ref(db, `instructors/${instructorUid}/students`));
    },
    [instructorUid]
  );

  return {
    students,
    loading,
    addStudent,
    addStudentsBulk,
    removeStudent,
    clearRoster,
    count: students.length,
  };
}
