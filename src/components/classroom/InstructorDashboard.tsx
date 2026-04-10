import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Users, 
  BookOpen, 
  CheckCircle, 
  UserX, 
  XCircle, 
  UserMinus, 
  Trash2, 
  Download, 
  Eye, 
  ClipboardList,
  MessageSquare,
  Play,
  Video,
  Link2,
  Sparkles,
  Maximize2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ref, remove } from "firebase/database";
import { db, isFirebaseConfigured } from "@/utils/firebase";
import { InstructorLayout, type NavPage } from "@/components/classroom/InstructorLayout";
import type { User } from "@/hooks/useAuth";
import type { SessionSummary } from "@/hooks/useInstructorSessions";

interface InstructorDashboardProps {
  user: User;
  sessions: SessionSummary[];
  sessionsLoading: boolean;
  onStartClass: (className: string) => void;
  onLogout: () => void;
  onUpdateSettings?: (name: string, email: string, totalStudents: number) => Promise<void>;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: number, end?: number) {
  const diff = Math.floor(((end || Date.now()) - start) / 1000);
  const m = Math.floor(diff / 60);
  return `${m} min`;
}

// ─── Dashboard View ──────────────────────────────────────────────
function DashboardView({
  user,
  sessions,
  sessionsLoading,
  onStartClass,
}: {
  user: User;
  sessions: SessionSummary[];
  sessionsLoading: boolean;
  onStartClass: () => void;
}) {
  const [chartPage, setChartPage] = useState(0);
  const CHART_PAGE_SIZE = 7;

  const activeSessions = sessions.filter((s) => s.status === "active");
  const pastSessions = sessions.filter((s) => s.status === "ended");
  const lastClass = pastSessions[0];

  // Calculate attendance stats
  // Priority: 1. Active session (if exactly one), 2. Most recent past session
  const targetSession = activeSessions.length === 1 ? activeSessions[0] : lastClass;
  
  const lastClassAttendance = targetSession
    ? targetSession.participants.filter((p) => !p.isInstructor).length
    : 0;
    
  const lastClassLeftEarly = targetSession && targetSession.status === 'ended'
    ? targetSession.participants.filter((p) => {
        const leftEarly = !!p.leftAt && targetSession.endedAt && p.leftAt < targetSession.endedAt - 5000;
        return !p.isInstructor && leftEarly;
      }).length
    : 0;

  const totalPages = Math.ceil(pastSessions.length / CHART_PAGE_SIZE);
  
  const chartData = pastSessions.slice(chartPage * CHART_PAGE_SIZE, (chartPage + 1) * CHART_PAGE_SIZE).reverse().map((s) => {
    const d = new Date(s.createdAt);
    const date = d.getDate();
    const month = d.toLocaleString("default", { month: "short" });
    const day = d.toLocaleString("default", { weekday: "short" });
    const label = `${day} ${month} ${date}`;
    return {
      name: label,
      Expected: user.totalStudents ?? 0,
      Present: s.participants.filter((p) => !p.isInstructor).length,
    };
  });

  // Activity feed for last class
  const lastClassActivity = lastClass
    ? lastClass.participants
        .filter((p) => !p.isInstructor)
        .map((p) => {
          const leftEarly =
            !!p.leftAt &&
            lastClass.endedAt &&
            p.leftAt < lastClass.endedAt - 5000;
          const minutesLeftEarly = leftEarly 
            ? Math.round((lastClass.endedAt! - p.leftAt!) / 60000) 
            : 0;
          return { ...p, leftEarly, minutesLeftEarly };
        })
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            Welcome back, {user.displayName}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's what's happening with your sessions
          </p>
        </div>
        <Button
          onClick={onStartClass}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-md shadow-primary/20"
        >
          Start New Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Total Sessions", value: sessions.length, icon: BookOpen, color: "bg-primary/10 text-primary" },
          { label: "Total Students", value: user.totalStudents ?? 0, icon: Users, color: "bg-primary/10 text-primary" },
          { label: "Student present", value: lastClassAttendance, icon: CheckCircle, color: "bg-success/10 text-success" },
          { label: "Student absent", value: targetSession ? Math.max(0, (user.totalStudents ?? 0) - lastClassAttendance) : 0, icon: UserX, color: "bg-destructive/10 text-destructive" },
          { label: "Student left session", value: lastClassLeftEarly, icon: UserMinus, color: "bg-warning/10 text-warning" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl bg-card/50 backdrop-blur-sm border border-white/5 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Sessions Banner */}
      {activeSessions.length > 0 && (
        <div className="rounded-2xl bg-success/5 px-5 py-4 flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse shrink-0" />
          <p className="text-sm font-medium text-foreground flex-1">
            You have {activeSessions.length} live session{activeSessions.length > 1 ? "s" : ""} right now
          </p>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-white/5 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground px-2">Attendance Overview</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground mr-1 font-medium bg-muted/30 px-2 py-1 rounded-lg">
                Showing {chartPage * CHART_PAGE_SIZE + 1}-{Math.min((chartPage + 1) * CHART_PAGE_SIZE, pastSessions.length)} of {pastSessions.length}
              </span>
              <div className="flex items-center bg-muted/20 rounded-xl p-0.5 border border-white/5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartPage(p => p + 1)}
                  disabled={chartPage >= totalPages - 1}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setChartPage(p => p - 1)}
                  disabled={chartPage === 0}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                  tick={{ fill: "#64748b" }}
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "#64748b" }}
                />
                <Tooltip
                  contentStyle={{ 
                    borderRadius: "16px", 
                    border: "none", 
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                    padding: "12px"
                  }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend 
                  iconType="circle" 
                  verticalAlign="top" 
                  align="right" 
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: "20px", fontSize: "12px", fontWeight: 500 }}
                />
                <Area
                  type="monotone"
                  dataKey="Expected"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpected)"
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="Present"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                  dot={{ r: 5, strokeWidth: 2, fill: "#14b8a6", stroke: "#fff" }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Last Class Activity */}
      {lastClass && (
        <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-white/5 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Last Session Activity — <span className="text-primary">{lastClass.name}</span>
            </h3>
            <span className="text-xs text-muted-foreground">{formatDate(lastClass.createdAt)}</span>
          </div>
          {lastClassActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No students attended this session.</p>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {lastClassActivity.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Joined at {new Date(p.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {p.leftEarly ? (
                    <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive font-semibold shadow-sm">
                      Left at {new Date(p.leftAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-lg bg-success/10 text-success font-semibold shadow-sm">
                      Present (Full)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sessions.length === 0 && !sessionsLoading && (
        <div className="rounded-2xl bg-background shadow-sm p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <BookOpen className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No sessions yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start your first session to see it here</p>
        </div>
      )}
    </div>
  );
}

// ─── Classes View ─────────────────────────────────────────────────
function ClassesView({ sessions }: { sessions: SessionSummary[] }) {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getClassLink = (id: string) => `${window.location.origin}/class/${id}`;
  const copyLink = (id: string) => {
    navigator.clipboard.writeText(getClassLink(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteSession = async (id: string) => {
    if (!isFirebaseConfigured || !db) return;
    await remove(ref(db, `sessions/${id}`));
  };

  const activeSessions = sessions.filter((s) => s.status === "active");
  const pastSessions = sessions.filter((s) => s.status === "ended");

  const [summarySession, setSummarySession] = useState<SessionSummary | null>(null);

  const downloadPdfSummary = async (s: SessionSummary) => {
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text(`Session Summary: ${s.name}`, 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Date: ${new Date(s.createdAt).toLocaleDateString()}`, 14, 30);
      doc.text(`Start Time: ${new Date(s.createdAt).toLocaleTimeString()}`, 14, 38);
      if (s.endedAt) {
        doc.text(`End Time: ${new Date(s.endedAt).toLocaleTimeString()}`, 14, 46);
        doc.text(`Duration: ${Math.floor((s.endedAt - s.createdAt) / 60000)} minutes`, 14, 54);
      }
      
      const students = s.participants.filter(p => !p.isInstructor);
      doc.text(`Total Students: ${students.length}`, 14, 66);
      
      // Attendance Table
      autoTable(doc, {
        startY: 72,
        head: [['Student Name', 'Joined At', 'Status']],
        body: students.map(p => {
          const leftEarly = !!p.leftAt && s.endedAt && p.leftAt < s.endedAt - 5000;
          return [
            p.name,
            new Date(p.joinedAt).toLocaleTimeString(),
            leftEarly ? `Left at ${new Date(p.leftAt!).toLocaleTimeString()}` : `Present (Full)`
          ]
        }),
        headStyles: { fillColor: [41, 128, 185] }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 72;

      // Chat
      if (s.chat && s.chat.length > 0) {
        doc.text("Chat Log", 14, finalY + 14);
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Time', 'Sender', 'Message']],
          body: s.chat.map(m => [
            new Date(m.timestamp).toLocaleTimeString(),
            m.senderName,
            m.text
          ]),
          headStyles: { fillColor: [100, 100, 100] }
        });
      }
      
      doc.save(`ScholarDeet_${s.name.replace(/\s+/g, '_')}_Summary.pdf`);
    } catch (err) {
      alert("Please install jspdf and jspdf-autotable to download PDFs. Run: npm install jspdf jspdf-autotable");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Sessions</h2>

      {/* Live Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <h3 className="text-sm font-semibold text-foreground">Live Now</h3>
          </div>
          {activeSessions.map((s) => (
            <div key={s.id} className="rounded-2xl bg-background shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">{s.name}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-success text-success-foreground px-2 py-0.5 rounded-full">Live</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Started {formatDate(s.createdAt)} · {s.participantCount} participants
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/class/${s.id}`)}
                  className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium shrink-0"
                >
                  <Maximize2 className="h-3 w-3 mr-1.5" /> Rejoin
                </Button>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                <code className="flex-1 text-xs text-foreground truncate font-mono">{getClassLink(s.id)}</code>
                  <button
                    onClick={() => copyLink(s.id)}
                    className="shrink-0 h-7 px-2 rounded-md bg-background shadow-sm text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                  >
                  {copiedId === s.id ? <><Check className="h-2.5 w-2.5 mr-1 text-success" /> Copied</> : <><Copy className="h-2.5 w-2.5 mr-1" /> Copy</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Classes */}
      {pastSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Past Sessions</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {pastSessions.map((s) => {
              const students = s.participants.filter((p) => !p.isInstructor);
              return (
                <div key={s.id} className="rounded-2xl bg-background shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(s.createdAt)} · {formatDuration(s.createdAt, s.endedAt)} · {students.length} students
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs hover:bg-primary/5" onClick={() => setSummarySession(s)}>
                      <Eye className="h-3 w-3 mr-1.5" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs bg-primary/5 hover:bg-primary/10 text-primary border-primary/20" onClick={() => downloadPdfSummary(s)}>
                      <Download className="h-3 w-3 mr-1.5" /> PDF
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                       <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10" title="Delete">
                        <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this session and all its data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSession(s.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="rounded-2xl bg-background p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No sessions yet</p>
        </div>
      )}

      {/* Summary Dialog */}
      <Dialog open={!!summarySession} onOpenChange={() => setSummarySession(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Summary — {summarySession?.name}
            </DialogTitle>
            <DialogDescription>
              {summarySession && formatDate(summarySession.createdAt)}
              {summarySession?.endedAt && ` — ${formatDate(summarySession.endedAt)}`}
            </DialogDescription>
          </DialogHeader>
          
          {summarySession && (() => {
            const students = summarySession.participants.filter(p => !p.isInstructor);
            const chat = summarySession.chat || [];
            
            return (
              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                <div>
                  <h4 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                    Attendance ({students.length})
                  </h4>
                  {students.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg text-center">No students attended.</p>
                  ) : (
                    <div className="space-y-2">
                      {students.map(p => {
                        const leftEarly = !!p.leftAt && summarySession.endedAt && p.leftAt < summarySession.endedAt - 5000;
                        return (
                          <div key={p.id} className="flex justify-between items-center text-sm p-3 rounded-xl bg-muted/30 shadow-sm">
                            <span className="font-medium">{p.name}</span>
                            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${leftEarly ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                              {leftEarly ? "Left Early" : "Present"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-3 text-foreground flex items-center gap-2">
                    Chat Log ({chat.length})
                  </h4>
                  {chat.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg text-center">No messages were sent.</p>
                  ) : (
                    <div className="space-y-3">
                      {chat.map((m, i) => (
                        <div key={m.id || i} className="text-sm p-3 rounded-xl bg-muted/30 space-y-1 shadow-sm">
                          <div className="flex gap-2 items-center">
                            <span className="font-semibold text-xs text-primary">{m.senderName}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-foreground text-sm">{m.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Attendance View ──────────────────────────────────────────────
function AttendanceView({ sessions }: { sessions: SessionSummary[] }) {
  const [attendanceSession, setAttendanceSession] = useState<SessionSummary | null>(null);
  const pastSessions = sessions.filter((s) => s.status === "ended");

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Attendance</h2>

      {pastSessions.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {pastSessions.map((s) => {
            const students = s.participants.filter((p) => !p.isInstructor);
            return (
              <div key={s.id} className="rounded-2xl bg-background shadow-sm p-4 space-y-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(s.createdAt)} · {students.length} students
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setAttendanceSession(s)}
                  >
                    <ClipboardList className="h-3 w-3 mr-1.5" /> Attendance
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-background p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No past sessions yet</p>
        </div>
      )}

      {/* Attendance Dialog */}
      <Dialog open={!!attendanceSession} onOpenChange={() => setAttendanceSession(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Attendance — {attendanceSession?.name}
            </DialogTitle>
            <DialogDescription>
              {attendanceSession && formatDate(attendanceSession.createdAt)}
              {attendanceSession?.endedAt && ` — ${formatDate(attendanceSession.endedAt)}`}
            </DialogDescription>
          </DialogHeader>
          {attendanceSession && (() => {
            const students = attendanceSession.participants.filter((p) => !p.isInstructor);
            return (
              <div className="space-y-1 overflow-y-auto flex-1">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No students attended this session.</p>
                ) : (
                  <>
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-bold text-muted-foreground bg-muted/30 rounded-lg sticky top-0">
                      <div className="col-span-1">S/N</div>
                      <div className="col-span-4">Name</div>
                      <div className="col-span-3">Joined</div>
                      <div className="col-span-4">Status</div>
                    </div>
                    {students.map((p, i) => {
                      const joinedTime = new Date(p.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const leftEarly = !!p.leftAt && attendanceSession.endedAt && p.leftAt < attendanceSession.endedAt - 5000;
                      return (
                        <div key={p.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 text-sm items-center rounded-lg hover:bg-muted/30">
                          <div className="col-span-1 text-xs font-medium text-muted-foreground">{i + 1}</div>
                          <div className="col-span-4 flex items-center gap-2">
                            <span className="truncate font-medium">{p.name}</span>
                          </div>
                          <div className="col-span-3 text-xs text-muted-foreground">{joinedTime}</div>
                          <div className="col-span-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              leftEarly ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                            }`}>
                              {leftEarly ? `Left at ${new Date(p.leftAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Present (Full)"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Profile View ────────────────────────────────────────────────
function ProfileView({
  user,
  onUpdateSettings,
}: {
  user: User;
  onUpdateSettings?: (name: string, email: string, totalStudents: number) => Promise<void>;
}) {
  const [name, setName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [total, setTotal] = useState(user.totalStudents?.toString() ?? "0");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handle = async () => {
    if (!onUpdateSettings) return;
    setLoading(true);
    await onUpdateSettings(name, email, parseInt(total) || 0);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] items-center justify-center p-4 sm:p-6 w-full">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Profile Settings</h2>
          <p className="text-sm text-muted-foreground font-medium">Manage your instructor profile and preferences</p>
        </div>
        <div className="rounded-3xl bg-background shadow-lg shadow-black/5 p-6 sm:p-8 space-y-5">
          <div className="space-y-2.5">
            <Label htmlFor="sName" className="font-semibold px-1">Display Name</Label>
            <Input id="sName" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl border-0 bg-muted/40 shadow-sm focus-visible:ring-1 focus-visible:bg-background transition-all px-4" />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="sEmail" className="font-semibold px-1">Email Address</Label>
            <Input id="sEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl border-0 bg-muted/40 shadow-sm focus-visible:ring-1 focus-visible:bg-background transition-all px-4" />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="sTotal" className="font-semibold px-1">Total Students</Label>
            <Input id="sTotal" type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} className="h-12 rounded-xl border-0 bg-muted/40 shadow-sm focus-visible:ring-1 focus-visible:bg-background transition-all px-4" />
          </div>
          <div className="pt-2">
            <Button onClick={handle} disabled={loading} className="w-full h-12 rounded-xl font-semibold shadow-md shadow-primary/20">
              {loading ? "Saving…" : saved ? "Saved Successfully!" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────
export function InstructorDashboard({
  user,
  sessions,
  sessionsLoading,
  onStartClass,
  onLogout,
  onUpdateSettings,
}: InstructorDashboardProps) {
  const [activePage, setActivePage] = useState<NavPage>("dashboard");
  const [classNameDialog, setClassNameDialog] = useState(false);
  const [className, setClassName] = useState("");

  const handleStartClass = () => {
    const name = className.trim() || `Class ${Date.now()}`;
    onStartClass(name);
    setClassName("");
    setClassNameDialog(false);
  };

  return (
    <InstructorLayout
      activePage={activePage}
      onNavigate={setActivePage}
      displayName={user.displayName}
      email={user.email}
      onLogout={onLogout}
    >
      {activePage === "dashboard" && (
        <DashboardView
          user={user}
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          onStartClass={() => setClassNameDialog(true)}
        />
      )}
      {activePage === "classes" && <ClassesView sessions={sessions} />}
      {activePage === "attendance" && <AttendanceView sessions={sessions} />}
      {activePage === "profile" && (
        <ProfileView user={user} onUpdateSettings={onUpdateSettings} />
      )}

      {/* Start Class Dialog */}
      <Dialog open={classNameDialog} onOpenChange={setClassNameDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Start a New Class</DialogTitle>
            <DialogDescription>Enter a name for your class session</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="className">Class Name</Label>
              <Input
                id="className"
                placeholder="e.g. Introduction to Biology"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartClass()}
                className="h-10 rounded-lg"
                autoFocus
              />
            </div>
            <Button onClick={handleStartClass} className="w-full h-10 rounded-lg">
              <Play className="h-4 w-4 mr-2" /> Start Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </InstructorLayout>
  );
}
