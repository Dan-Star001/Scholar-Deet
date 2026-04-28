import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Avatar, Chip, LinearProgress, InputAdornment, Alert, Tooltip as MuiTooltip } from "@mui/material";
import { Add as PlusIcon, Groups, MenuBook, CheckCircle, PersonOff, Cancel as XCircle, PersonRemove, Delete as Trash2Icon, Download, Visibility, Assignment, Chat, PlayArrow as PlayIcon, OpenInFull as Maximize2Icon, ContentCopy as CopyIcon, Check, ChevronLeft, ChevronRight, Edit, School, Email, Business, People, PersonAdd, UploadFile, Search, Close, Save, Badge, CameraAlt,
  AccountCircle,
} from "@mui/icons-material";
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";
import { ref, remove } from "firebase/database";
import { db, isFirebaseConfigured } from "@/utils/firebase";
import { InstructorLayout, type NavPage } from "@/components/classroom/InstructorLayout";
import type { User } from "@/hooks/useAuth";
import type { SessionSummary } from "@/hooks/useInstructorSessions";
import { useStudentRoster } from "@/hooks/useStudentRoster";
import { parseStudentFile } from "@/utils/parseStudentFile";
import ImageCropDialog from "./ImageCropDialog";

// ─── Custom Chart Tooltip ───────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5">
        <Typography variant="caption" className="font-black text-foreground block mb-2 uppercase tracking-tight opacity-70">
          {label}
        </Typography>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <Typography variant="body2" className="font-bold text-foreground">
                {entry.name}: <span className="text-secondary font-black">{entry.value}</span>
              </Typography>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface InstructorDashboardProps {
  user: User;
  sessions: SessionSummary[];
  sessionsLoading: boolean;
  onStartClass: (className: string) => void;
  onLogout: () => void;
  onUpdateSettings?: (name: string, email: string, totalStudents: number, institution?: string, department?: string) => Promise<void>;
  onUpdatePhoto?: (base64: string) => Promise<void>;
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
          <Typography variant="h5" className="font-bold text-foreground">
            Welcome back, {user.displayName}
          </Typography>
          <Typography variant="body2" className="text-muted-foreground mt-0.5">
            Here's what's happening with your sessions
          </Typography>
        </div>
        <Button
          variant="contained"
          onClick={onStartClass}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-md normal-case"
          startIcon={<PlusIcon />}
        >
          Start New Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Total Sessions", value: sessions.length, icon: MenuBook, color: "bg-primary/10 text-primary" },
          { label: "Total Students", value: user.totalStudents ?? 0, icon: Groups, color: "bg-primary/10 text-primary" },
          { label: "Student present", value: lastClassAttendance, icon: CheckCircle, color: "bg-success/10 text-success" },
          { label: "Student absent", value: targetSession ? Math.max(0, (user.totalStudents ?? 0) - lastClassAttendance) : 0, icon: PersonOff, color: "bg-destructive/10 text-destructive" },
          { label: "Student left session", value: lastClassLeftEarly, icon: PersonRemove, color: "bg-warning/10 text-warning" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl bg-card shadow-md p-4 sm:p-5">
            <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon fontSize="small" />
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

      {/* Chart Card */}
      {chartData.length > 0 && (
        <div className="rounded-3xl bg-card shadow-md p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <Typography variant="subtitle2" className="font-extrabold text-foreground uppercase tracking-tight">Attendance Chart</Typography>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-muted-foreground mr-1 font-black bg-primary/5 text-primary px-3 py-1 rounded-full">
                {chartPage * CHART_PAGE_SIZE + 1}-{Math.min((chartPage + 1) * CHART_PAGE_SIZE, pastSessions.length)} / {pastSessions.length}
              </span>
              <div className="flex items-center bg-muted/20 rounded-xl p-1">
                <Button
                  size="small"
                  onClick={() => setChartPage(p => p + 1)}
                  disabled={chartPage >= totalPages - 1}
                  className="min-w-0 h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/40 disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="small"
                  onClick={() => setChartPage(p => p - 1)}
                  disabled={chartPage === 0}
                  className="min-w-0 h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/40 disabled:opacity-20 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="h-[280px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#E2E8F0" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                  tick={{ fill: "#94a3b8", fontWeight: 700, fontFamily: "inherit" }}
                />
                <YAxis 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontWeight: 700, fontFamily: "inherit" }}
                />
                <Tooltip 
                  cursor={{ stroke: '#2B2D42', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={<CustomTooltip />} 
                />
                <Legend 
                  iconType="circle" 
                  verticalAlign="top" 
                  align="right" 
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: "25px", fontSize: "10px", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Area
                  type="stepBefore"
                  dataKey="Expected"
                  fill="rgba(148, 163, 184, 0.1)"
                  stroke="#CBD5E1"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  name="CAPACITY"
                />
                <Line
                  type="monotone"
                  dataKey="Present"
                  stroke="#2B2D42"
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 1.5, fill: "var(--background)", stroke: "#2B2D42" }}
                  activeDot={{ r: 5, strokeWidth: 2, fill: "#2B2D42", stroke: "var(--background)" }}
                  name="ATTENDANCE"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity Card */}
      {lastClass && (
        <div className="rounded-2xl bg-card shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider opacity-60">
              Session Overview — <span className="text-primary font-black">{lastClass.name}</span>
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">{formatDate(lastClass.createdAt)}</span>
          </div>
          {lastClassActivity.length === 0 ? (
            <div className="py-8 text-center bg-muted/5 rounded-xl border border-dashed border-muted/20">
              <p className="text-sm text-muted-foreground">No student interactions detected</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {lastClassActivity.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-all group">
                  <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-xs font-black text-primary transition-transform group-hover:scale-110">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      In at {new Date(p.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {p.leftEarly ? (
                    <div className="text-right">
                      <span className="text-[9px] block text-destructive font-black uppercase mb-0.5">Early Exit</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-destructive/10 text-destructive font-bold">
                        {new Date(p.leftAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-success/10 text-success font-black uppercase tracking-tighter">
                      Engaged
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
            <MenuBook className="h-7 w-7 text-muted-foreground/50" />
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

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Typography variant="h6" className="font-semibold text-foreground">Sessions</Typography>

      {/* Live Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <Typography variant="caption" className="font-semibold text-foreground">Live Now</Typography>
          </div>
          {activeSessions.map((s) => (
            <div key={s.id} className="rounded-2xl bg-card shadow-md p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Typography variant="subtitle1" className="font-semibold text-foreground">{s.name}</Typography>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-success text-success-foreground px-2 py-0.5 rounded-full">Live</span>
                  </div>
                  <Typography variant="caption" className="text-muted-foreground block">
                    Started {formatDate(s.createdAt)} · {s.participantCount} participants
                  </Typography>
                </div>
                  <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate(`/class/${s.id}`)}
                  className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0 normal-case"
                >
                  <Maximize2Icon className="h-3 w-3 mr-1.5" /> Rejoin
                </Button>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
                <code className="flex-1 text-xs text-foreground truncate font-mono font-bold">{getClassLink(s.id)}</code>
                  <Button
                    size="small"
                    onClick={() => copyLink(s.id)}
                    className="shrink-0 h-8 min-w-0 px-3 rounded-lg bg-primary text-primary-foreground shadow-md text-xs font-bold hover:bg-primary/90 transition-all normal-case"
                  >
                  {copiedId === s.id ? <><Check className="h-3 w-3 mr-1.5" /> Copied</> : <><CopyIcon className="h-3 w-3 mr-1.5" /> Copy</>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Classes */}
      {pastSessions.length > 0 && (
        <div className="space-y-3">
          <Typography variant="caption" className="font-semibold text-foreground">Past Sessions</Typography>
          <div className="grid sm:grid-cols-2 gap-3">
            {pastSessions.map((s) => {
              const students = s.participants.filter((p) => !p.isInstructor);
              return (
                <div key={s.id} className="rounded-2xl bg-card shadow-sm p-4 space-y-3 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="min-w-0">
                        <Typography variant="subtitle2" className="font-semibold text-foreground truncate">{s.name}</Typography>
                        <Typography variant="caption" className="text-muted-foreground block mt-0.5">
                          {formatDate(s.createdAt)} · {formatDuration(s.createdAt, s.endedAt)} · {students.length} students
                        </Typography>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="contained"
                      size="small"
                      className="h-8 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm normal-case font-bold"
                      onClick={() => setSummarySession(s)}
                    >
                      <Visibility className="h-3 w-3 mr-1.5" /> View
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      className="h-8 rounded-lg text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm normal-case font-bold"
                      onClick={() => downloadPdfSummary(s)}
                    >
                      <Download className="h-3 w-3 mr-1.5" /> PDF
                    </Button>
                      <IconButton
                      size="small"
                      onClick={() => setDeleteConfirmId(s.id)}
                      className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete Session?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-muted-foreground">
            This will permanently delete this session and all its data. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDeleteConfirmId(null)} className="normal-case">Cancel</Button>
          <Button 
            onClick={() => {
              if (deleteConfirmId) deleteSession(deleteConfirmId);
              setDeleteConfirmId(null);
            }} 
            variant="contained" 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 normal-case"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {sessions.length === 0 && (
        <div className="rounded-2xl bg-background p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No sessions yet</p>
        </div>
      )}

      {/* Summary Dialog */}
      <Dialog 
        open={!!summarySession} 
        onClose={() => setSummarySession(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            className: "rounded-3xl",
          }
        }}
      >
        <DialogTitle className="flex justify-between items-start">
          <div>
            <Typography variant="h6" className="font-bold text-foreground">Summary — {summarySession?.name}</Typography>
            <Typography variant="caption" className="text-muted-foreground block">
              {summarySession && formatDate(summarySession.createdAt)}
              {summarySession?.endedAt && ` — ${formatDate(summarySession.endedAt)}`}
            </Typography>
          </div>
          <IconButton onClick={() => setSummarySession(null)} size="small">
            <XCircle className="h-5 w-5" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers className="max-h-[70vh] overflow-y-auto">
          {summarySession && (() => {
            const students = summarySession.participants.filter(p => !p.isInstructor);
            const chat = summarySession.chat || [];
            
            return (
              <div className="space-y-6 py-2">
                <div>
                  <Typography variant="subtitle2" className="font-bold mb-3 text-foreground flex items-center gap-2">
                    Attendance ({students.length})
                  </Typography>
                  {students.length === 0 ? (
                    <Typography variant="body2" className="text-muted-foreground bg-muted/30 p-4 rounded-2xl text-center">No students attended.</Typography>
                  ) : (
                    <div className="space-y-2">
                      {students.map(p => {
                        const leftEarly = !!p.leftAt && summarySession.endedAt && p.leftAt < summarySession.endedAt - 5000;
                        return (
                          <div key={p.id} className="flex justify-between items-center text-sm p-4 rounded-2xl bg-muted/20 border border-border/50">
                            <Typography variant="body2" className="font-medium">{p.name}</Typography>
                            <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full ${leftEarly ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                              {leftEarly ? "Left Early" : "Present"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <Typography variant="subtitle2" className="font-bold mb-3 text-foreground flex items-center gap-2">
                    Chat Log ({chat.length})
                  </Typography>
                  {chat.length === 0 ? (
                    <Typography variant="body2" className="text-muted-foreground bg-muted/30 p-4 rounded-2xl text-center">No messages were sent.</Typography>
                  ) : (
                    <div className="space-y-3">
                      {chat.map((m, i) => (
                        <div key={m.id || i} className="text-sm p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-1">
                          <div className="flex gap-2 items-center">
                            <Typography variant="caption" className="font-bold text-primary">{m.senderName}</Typography>
                            <Typography variant="caption" className="text-[10px] text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString()}</Typography>
                          </div>
                          <Typography variant="body2" className="text-foreground">{m.text}</Typography>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setSummarySession(null)} className="normal-case">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// ─── Attendance View ──────────────────────────────────────────────
function AttendanceView({ sessions }: { sessions: SessionSummary[] }) {
  const [attendanceSession, setAttendanceSession] = useState<SessionSummary | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const pastSessions = sessions.filter((s) => s.status === "ended");

  const deleteSession = async (id: string) => {
    if (!isFirebaseConfigured || !db) return;
    await remove(ref(db, `sessions/${id}`));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Typography variant="h6" className="font-semibold text-foreground">Attendance</Typography>

      {pastSessions.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {pastSessions.map((s) => {
            const students = s.participants.filter((p) => !p.isInstructor);
            return (
              <div key={s.id} className="rounded-2xl bg-card shadow-sm p-4 space-y-3 transition-all hover:shadow-md">
                <div className="min-w-0">
                  <Typography variant="subtitle2" className="font-semibold text-foreground truncate">{s.name}</Typography>
                  <Typography variant="caption" className="text-muted-foreground block mt-0.5">
                    {formatDate(s.createdAt)} · {students.length} students
                  </Typography>
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                    variant="contained"
                    size="small"
                    className="h-8 rounded-lg text-xs normal-case bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-bold"
                    onClick={() => setAttendanceSession(s)}
                  >
                    <Assignment className="h-3 w-3 mr-1.5" /> Attendance
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => setDeleteConfirmId(s.id)}
                    className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-background p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Groups className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <Typography variant="body2" className="mt-4 font-medium text-foreground">No past sessions yet</Typography>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete Attendance?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-muted-foreground">
            This will permanently delete this session and its attendance data. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDeleteConfirmId(null)} className="normal-case">Cancel</Button>
          <Button 
            onClick={() => {
              if (deleteConfirmId) deleteSession(deleteConfirmId);
              setDeleteConfirmId(null);
            }} 
            variant="contained" 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 normal-case"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog 
        open={!!attendanceSession} 
        onClose={() => setAttendanceSession(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { className: "rounded-3xl" } }}
      >
        <DialogTitle>
          <Typography variant="h6" className="font-bold">Attendance — {attendanceSession?.name}</Typography>
          <Typography variant="caption" className="text-muted-foreground block">
            {attendanceSession && formatDate(attendanceSession.createdAt)}
            {attendanceSession?.endedAt && ` — ${formatDate(attendanceSession.endedAt)}`}
          </Typography>
        </DialogTitle>
        <DialogContent dividers className="max-h-[60vh] overflow-y-auto">
          {attendanceSession && (() => {
            const students = attendanceSession.participants.filter((p) => !p.isInstructor);
            return (
              <div className="space-y-1">
                {students.length === 0 ? (
                  <Typography variant="body2" className="text-muted-foreground text-center py-8">No students attended this session.</Typography>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold text-muted-foreground bg-card rounded-lg sticky top-0 uppercase tracking-wider shadow-sm z-10">
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
                            <Typography variant="body2" className="truncate font-medium">{p.name}</Typography>
                          </div>
                          <div className="col-span-3 text-[10px] text-muted-foreground font-medium">{joinedTime}</div>
                          <div className="col-span-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${
                              leftEarly ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                            }`}>
                              {leftEarly ? `Left ${new Date(p.leftAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Present"}
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
        <DialogActions className="p-4">
          <Button onClick={() => setAttendanceSession(null)} className="normal-case">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// ─── Compress image to base64 (max 200x200, JPEG 0.75) ────────────
function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Profile View ─────────────────────────────────────────────────
function ProfileView({
  user,
  onUpdateSettings,
  onUpdatePhoto,
}: {
  user: User;
  onUpdateSettings?: (name: string, email: string, totalStudents: number, institution?: string, department?: string) => Promise<void>;
  onUpdatePhoto?: (base64: string) => Promise<void>;
}) {
  // ── Edit dialog state ──
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [total, setTotal] = useState(user.totalStudents?.toString() ?? "0");
  const [institution, setInstitution] = useState(user.institution ?? "");
  const [department, setDepartment] = useState(user.department ?? "");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ── Photo state ──
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(user.photoURL);
  
  // Crop state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);

  // ── Student roster ──
  const capacity = user.totalStudents ?? 0;
  const { students, loading: rosterLoading, addStudent, addStudentsBulk, removeStudent, clearRoster, count } = useStudentRoster(user.uid);

  // Add student dialog
  const [addOpen, setAddOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentMatric, setNewStudentMatric] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // File import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ added: number; skipped: number } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Student search
  const [search, setSearch] = useState("");

  // Auto-dismiss alerts
  useEffect(() => {
    if (importStatus) {
      const timer = setTimeout(() => setImportStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [importStatus]);

  useEffect(() => {
    if (addSuccess) {
      const timer = setTimeout(() => setAddSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [addSuccess]);

  useEffect(() => {
    if (settingsSaved) {
      const timer = setTimeout(() => setSettingsSaved(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [settingsSaved]);

  useEffect(() => {
    if (addError) {
      const timer = setTimeout(() => setAddError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [addError]);

  const openEditDialog = () => {
    setName(user.displayName);
    setEmail(user.email);
    setTotal(user.totalStudents?.toString() ?? "0");
    setInstitution(user.institution ?? "");
    setDepartment(user.department ?? "");
    setSettingsSaved(false);
    setEditOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!onUpdateSettings) return;
    setSettingsSaving(true);
    await onUpdateSettings(name, email, parseInt(total) || 0, institution, department);
    setSettingsSaving(false);
    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setEditOpen(false);
    }, 1000);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdatePhoto) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      setTempImage(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    
    // reset input
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedImage: string) => {
    if (!onUpdatePhoto) return;
    setPhotoUploading(true);
    try {
      setPhotoPreview(croppedImage);
      await onUpdatePhoto(croppedImage);
    } catch {
      // silent
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) { 
      setAddError("Name is required."); 
      setTimeout(() => setAddError(""), 3500);
      return; 
    }

    // Capacity check
    if (capacity > 0 && count >= capacity) {
      setAddError("Limit exceeded: Maximum student capacity reached.");
      return;
    }

    setAddLoading(true);
    const ok = await addStudent(newStudentName, newStudentMatric);
    setAddLoading(false);
    if (!ok) { 
      setAddError("Could not add student. Please try again."); 
      setTimeout(() => setAddError(""), 3500);
      return; 
    }
    setAddSuccess(true);
    setNewStudentName("");
    setNewStudentMatric("");
    setAddError("");
    setTimeout(() => {
      setAddSuccess(false);
      setAddOpen(false);
    }, 1500);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportStatus(null);
    try {
      const parsed = await parseStudentFile(file);
      
      let toAdd = parsed;
      let limitExceeded = false;
      
      if (capacity > 0) {
        const remaining = capacity - count;
        if (remaining <= 0) {
          setImportStatus({ added: 0, skipped: -2 }); // -2 custom code for limit reached
          return;
        }
        if (parsed.length > remaining) {
          toAdd = parsed.slice(0, remaining);
          limitExceeded = true;
        }
      }

      const result = await addStudentsBulk(toAdd);
      if (limitExceeded) {
        // We use a custom property or handle it in the UI
        setImportStatus({ ...result, skipped: result.skipped + (parsed.length - toAdd.length) });
      } else {
        setImportStatus(result);
      }
    } catch {
      setImportStatus({ added: 0, skipped: -1 });
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.matricNo.toLowerCase().includes(search.toLowerCase())
  );

  const initials = user.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const capacityPct = capacity > 0 ? Math.min(100, Math.round((count / capacity) * 100)) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">

      {/* ── Profile Card ─────────────────────────────────────── */}
      <div className="rounded-3xl bg-card shadow-lg overflow-hidden">
        {/* Gradient Banner (Fixed Light Mode Palette) */}
        <div className="h-28 relative" style={{ background: 'linear-gradient(to right, #2a2c41, #2a2c41cc, #8ad9e299)' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        </div>

        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">

            {/* Avatar with camera overlay */}
            <div className="relative w-fit">
              <Avatar
                src={photoPreview}
                sx={{
                  width: 88, height: 88,
                  fontSize: 30, fontWeight: 900,
                  bgcolor: 'primary.main',
                  border: '4px solid',
                  borderColor: 'background.paper',
                  boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
                  color: 'primary.contrastText',
                }}
              >
                {!photoPreview && initials}
              </Avatar>
              {/* Camera Upload Button */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <MuiTooltip title="Change profile photo">
                <IconButton
                  size="small"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  sx={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 28, height: 28,
                    bgcolor: 'background.paper',
                    border: '2px solid',
                    borderColor: 'divider',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <CameraAlt sx={{ fontSize: 14 }} />
                </IconButton>
              </MuiTooltip>
            </div>

            {/* Edit button */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<Edit fontSize="small" />}
              onClick={openEditDialog}
              className="rounded-xl normal-case border-border text-foreground hover:bg-muted font-bold h-9 self-end sm:self-auto mb-1"
            >
              Edit Profile
            </Button>
          </div>

          {/* Profile info (view mode) */}
          <div className="mt-4 space-y-2">
            <Typography variant="h5" className="font-black text-foreground leading-tight">{user.displayName}</Typography>
            <div className="flex items-center gap-1.5">
              <Email sx={{ fontSize: 14 }} className="text-muted-foreground" />
              <Typography variant="body2" className="text-muted-foreground">{user.email}</Typography>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {user.institution && (
                <Chip icon={<Business sx={{ fontSize: 14 }} />} label={user.institution} size="small"
                  sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, fontSize: 11 }}
                />
              )}
              {user.department && (
                <Chip icon={<School sx={{ fontSize: 14 }} />} label={user.department} size="small"
                  sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', fontWeight: 700, fontSize: 11 }}
                />
              )}
              <Chip
                icon={<People sx={{ fontSize: 14 }} />}
                label={capacity > 0 ? `${capacity} Students Max` : 'No cap set'}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: 11 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Student Roster Card ───────────────────────────────── */}
      <div className="rounded-3xl bg-card shadow-lg p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Typography variant="h6" className="font-black text-foreground">Student Roster</Typography>
              <Chip
                label={capacity > 0 ? `${count} / ${capacity}` : `${count} enrolled`}
                size="small"
                color={count >= capacity && capacity > 0 ? "error" : "primary"}
                sx={{ fontWeight: 700, fontSize: 11, height: 20 }}
              />
            </div>
            <Typography variant="caption" className="text-muted-foreground">Registered students for your class</Typography>
          </div>
          <div className="flex gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.txt,.docx"
              className="hidden"
              onChange={handleFileImport}
            />
            <MuiTooltip title="Import from Excel, CSV, PDF or text file">
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={importLoading ? undefined : <UploadFile fontSize="small" />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                  className="rounded-xl normal-case border-border text-foreground hover:bg-muted font-bold h-9"
                >
                  {importLoading ? "Importing…" : "Import File"}
                </Button>
              </span>
            </MuiTooltip>
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAdd fontSize="small" />}
              onClick={() => { setAddError(""); setAddOpen(true); }}
              className="rounded-xl normal-case font-bold h-9"
            >
              Add Student
            </Button>
          </div>
        </div>

        {/* Capacity fill bar */}
        {capacity > 0 && (
          <div className="space-y-1">
            <LinearProgress
              variant="determinate"
              value={capacityPct}
              color={capacityPct >= 100 ? "error" : capacityPct >= 80 ? "warning" : "primary"}
              sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
            />
            <Typography variant="caption" className="text-muted-foreground">
              {count} of {capacity} students registered — session join limit
            </Typography>
          </div>
        )}

        {/* Import status */}
        {importStatus && (
          <Alert
            severity={
              importStatus.skipped === -1 || importStatus.skipped === -2 
                ? "error" 
                : importStatus.added === 0 
                ? "warning" 
                : "success"
            }
            onClose={() => setImportStatus(null)}
            className="rounded-xl font-bold"
            sx={importStatus.skipped === -2 ? {
              bgcolor: 'error.main',
              color: 'error.contrastText',
              '& .MuiAlert-icon': { color: 'inherit' }
            } : {}}
          >
            {importStatus.skipped === -1
              ? "Failed to parse file. Please check the format and try again."
              : importStatus.skipped === -2
              ? "Limit exceeded: Maximum student capacity reached."
              : importStatus.added === 0
              ? "No student names could be found in the file. Please check the format."
              : `Successfully imported ${importStatus.added} student${importStatus.added !== 1 ? "s" : ""}.${
                  importStatus.skipped > 0 ? ` (${importStatus.skipped} entries skipped or capped)` : ""
                }`}
          </Alert>
        )}

        {/* Search */}
        {students.length > 0 && (
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name or matric no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" className="text-muted-foreground" />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        {/* Student list */}
        {rosterLoading ? (
          <div className="py-8 text-center">
            <Typography variant="caption" className="text-muted-foreground">Loading roster…</Typography>
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <People fontSize="large" className="text-muted-foreground/40" />
            </div>
            <Typography variant="body2" className="font-medium text-foreground">No students yet</Typography>
            <Typography variant="caption" className="text-muted-foreground block">
              Add students manually or import from a file.
            </Typography>
          </div>
        ) : filteredStudents.length === 0 ? (
          <Typography variant="body2" className="text-center text-muted-foreground py-6">No matches found.</Typography>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold text-muted-foreground bg-card rounded-lg sticky top-0 uppercase tracking-wider shadow-sm z-10">
              <div className="col-span-1">#</div>
              <div className="col-span-6">Name</div>
              <div className="col-span-4">Matric No.</div>
              <div className="col-span-1"></div>
            </div>
            {filteredStudents.map((s, i) => (
              <div key={s.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors items-center group">
                <div className="col-span-1 text-xs font-bold text-muted-foreground">{i + 1}</div>
                <div className="col-span-6 flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-black text-primary shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <Typography variant="body2" className="font-semibold text-foreground truncate">{s.name}</Typography>
                </div>
                <div className="col-span-4">
                  <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg">
                    {s.matricNo || "—"}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <IconButton
                    size="small"
                    onClick={() => removeStudent(s.id)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Profile Dialog ─────────────────────────────────── */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { className: "rounded-3xl" } }}
      >
        <DialogTitle className="flex items-center justify-between pb-1">
          <div>
            <Typography variant="h6" className="font-black">Edit Profile</Typography>
            <Typography variant="caption" className="text-muted-foreground block">Update your instructor information</Typography>
          </div>
          <IconButton size="small" onClick={() => setEditOpen(false)} className="text-muted-foreground">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="space-y-5 pt-16 pb-4">
          {settingsSaved && <Alert severity="success" className="rounded-xl">Profile saved successfully!</Alert>}

          {/* Photo section */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20">
            <Avatar
              src={photoPreview}
              sx={{
                width: 64, height: 64,
                fontSize: 22, fontWeight: 900,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                flexShrink: 0,
              }}
            >
              {!photoPreview && initials}
            </Avatar>
            <div className="flex-1 min-w-0">
              <Typography variant="body2" className="font-semibold text-foreground">Profile Photo</Typography>
              <Typography variant="caption" className="text-muted-foreground block">JPG, PNG up to 5MB · Resized to 200×200px</Typography>
            </div>
            <Button
              variant="outlined"
              size="small"
              startIcon={photoUploading ? undefined : <CameraAlt fontSize="small" />}
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="rounded-xl normal-case font-bold border-border shrink-0"
            >
              {photoUploading ? "Uploading…" : "Change"}
            </Button>
          </div>

          {/* Grid form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="outlined"
              size="small"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><AccountCircle fontSize="small" className="text-muted-foreground" /></InputAdornment>
                }
              }}
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              size="small"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><Email fontSize="small" className="text-muted-foreground" /></InputAdornment>
                }
              }}
            />
            <TextField
              fullWidth
              label="Institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              variant="outlined"
              size="small"
              placeholder="e.g. University of Lagos"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><Business fontSize="small" className="text-muted-foreground" /></InputAdornment>
                }
              }}
            />
            <TextField
              fullWidth
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              variant="outlined"
              size="small"
              placeholder="e.g. Computer Science"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><School fontSize="small" className="text-muted-foreground" /></InputAdornment>
                }
              }}
            />
            <TextField
              fullWidth
              label="Total Students (session join cap)"
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              variant="outlined"
              size="small"
              helperText="Max students allowed to join a live session"
              className="sm:col-span-2"
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><People fontSize="small" className="text-muted-foreground" /></InputAdornment>
                }
              }}
            />
          </div>
        </DialogContent>

        <DialogActions className="p-4 gap-2">
          <Button onClick={() => setEditOpen(false)} className="normal-case" color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            className="normal-case font-bold rounded-xl"
            startIcon={settingsSaving ? undefined : <Save fontSize="small" />}
          >
            {settingsSaving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Student Dialog ────────────────────────────────── */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ 
          paper: { 
            className: "rounded-3xl",
            sx: { bgcolor: 'background.paper', overflow: 'hidden' }
          } 
        }}
      >
        {/* Decorative Header Banner */}
        <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
        
        <DialogTitle className="flex items-start justify-between pb-2 pt-6">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform hover:scale-105">
              <PersonAdd className="h-6 w-6" />
            </div>
            <div>
              <Typography variant="h6" className="font-black text-foreground">Add Student</Typography>
              <Typography variant="caption" className="text-muted-foreground block font-medium">
                {count} student{count !== 1 ? "s" : ""} registered{capacity > 0 ? ` · ${capacity} cap` : ""}
              </Typography>
            </div>
          </div>
          <IconButton 
            size="small" 
            onClick={() => { setAddOpen(false); setAddError(""); setNewStudentName(""); setNewStudentMatric(""); }} 
            className="text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="space-y-6 pt-16 pb-4">
          {addSuccess && (
            <Alert 
              severity="success" 
              variant="outlined"
              className="rounded-2xl border-success/20 bg-success/5 text-success font-medium"
            >
              Student added to roster successfully!
            </Alert>
          )}
          {addError && (
            <Alert 
              severity="error" 
              variant="outlined"
              className="rounded-2xl border-destructive/20 bg-destructive/5 text-destructive font-medium"
            >
              {addError}
            </Alert>
          )}
          
          <div className="space-y-5">
            <TextField
              fullWidth
              label="Full Name"
              placeholder="e.g. John Doe"
              value={newStudentName}
              onChange={(e) => { setNewStudentName(e.target.value); setAddError(""); }}
              variant="outlined"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
              slotProps={{
                input: {
                  className: "rounded-xl",
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle fontSize="small" className="text-primary/70" />
                    </InputAdornment>
                  )
                },
              }}
            />
            <TextField
              fullWidth
              label="Matric No. / Student ID"
              placeholder="Optional"
              value={newStudentMatric}
              onChange={(e) => setNewStudentMatric(e.target.value)}
              variant="outlined"
              onKeyDown={(e) => e.key === "Enter" && handleAddStudent()}
              slotProps={{
                input: {
                  className: "rounded-xl",
                  startAdornment: (
                    <InputAdornment position="start">
                      <Badge fontSize="small" className="text-primary/70" />
                    </InputAdornment>
                  )
                },
              }}
            />
          </div>
        </DialogContent>

        <DialogActions className="p-6 pt-4 gap-3">
          <Button 
            onClick={() => { setAddOpen(false); setAddError(""); setNewStudentName(""); setNewStudentMatric(""); }} 
            className="normal-case font-bold h-11 px-6 rounded-xl text-muted-foreground hover:bg-muted/50" 
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleAddStudent}
            disabled={addLoading || !newStudentName.trim()}
            className="normal-case font-black h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            startIcon={addLoading ? undefined : <PlusIcon fontSize="small" />}
          >
            {addLoading ? "Adding..." : "Confirm & Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Crop Dialog */}
      {tempImage && (
        <ImageCropDialog
          open={cropDialogOpen}
          image={tempImage}
          onClose={() => setCropDialogOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
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
  onUpdatePhoto,
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
      photoURL={user.photoURL}
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
        <ProfileView user={user} onUpdateSettings={onUpdateSettings} onUpdatePhoto={onUpdatePhoto} />
      )}

      {/* Start Class Dialog */}
      <Dialog 
        open={classNameDialog} 
        onClose={() => setClassNameDialog(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { className: "rounded-3xl p-2" } }}
      >
        <DialogTitle>
          <Typography variant="h6" className="font-bold">Start a New Class</Typography>
          <Typography variant="caption" className="text-muted-foreground block">Enter a name for your class session</Typography>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-6 pt-2">
            <TextField
              fullWidth
              autoFocus
              label="Class Name"
              placeholder="e.g. Introduction to Biology"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartClass()}
              variant="outlined"
            />
            <Button 
              variant="contained"
              fullWidth
              onClick={handleStartClass} 
              className="h-12 rounded-xl font-bold shadow-md normal-case"
              startIcon={<PlayIcon />}
            >
              Start Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </InstructorLayout>
  );
}
