import { useState } from "react";
import logo from "@/assets/scholar-deet-logo.png";
import { useTheme } from "next-themes";

import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardList, 
  User, 
  Moon, 
  Sun, 
  LogOut,
  ChevronLeft,
  X,
  Menu
} from "lucide-react";

export type NavPage = "dashboard" | "classes" | "attendance" | "profile";

interface NavItem {
  id: NavPage;
  label: string;
  icon: any;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "classes", label: "Sessions", icon: BookOpen },
  { id: "attendance", label: "Attendance", icon: ClipboardList },
  { id: "profile", label: "Profile", icon: User },
];

interface InstructorLayoutProps {
  children: React.ReactNode;
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  displayName: string;
  email: string;
  onLogout: () => void;
}

export function InstructorLayout({
  children,
  activePage,
  onNavigate,
  displayName,
  email,
  onLogout,
}: InstructorLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + Brand */}
      <div className="flex items-center gap-0 px-3 py-1.5">
        <img src="/scholar-deet-logo.png" alt="Scholar Deet" className="h-28 w-28 shrink-0 p-0 dark:brightness-110 dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
        <span className="font-bold text-lg text-foreground whitespace-nowrap -ml-4">Scholar Deet</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 pt-0 pb-4 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => {
                onNavigate(id);
                setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Bottom — User info + logout */}
      <div className="px-3 py-4 space-y-3 mt-auto">
        <div className="flex items-center gap-2 px-2 pb-2">
           <button
             onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
             className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
           >
             {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
             <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
           </button>
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-background shadow-lg shadow-black/5 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-background shadow-2xl transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-0 px-3 py-4 bg-background shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted mr-0"
          >
            <Menu className="h-6 w-6" />
          </button>
          <img src="/scholar-deet-logo.png" alt="Scholar Deet" className="h-20 w-20 p-0" />
          <span className="font-bold text-foreground whitespace-nowrap -ml-3">Scholar Deet</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
