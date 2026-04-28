import { useState } from "react";
import logo from "@/assets/scholar-deet-logo.png";
import { useTheme } from "next-themes";
import { 
  Button, 
  IconButton, 
  Typography, 
  Avatar, 
  Divider, 
  Drawer
} from "@mui/material";

import { 
  Dashboard as DashboardIcon, 
  MenuBook, 
  Assignment, 
  Person, 
  DarkMode, 
  LightMode, 
  Logout,
  Close,
  Menu as MenuIcon
} from "@mui/icons-material";

export type NavPage = "dashboard" | "classes" | "attendance" | "profile";

interface NavItem {
  id: NavPage;
  label: string;
  icon: any;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: DashboardIcon },
  { id: "classes", label: "Sessions", icon: MenuBook },
  { id: "attendance", label: "Attendance", icon: Assignment },
  { id: "profile", label: "Profile", icon: Person },
];

interface InstructorLayoutProps {
  children: React.ReactNode;
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  displayName: string;
  email: string;
  photoURL?: string;
  onLogout: () => void;
}

export function InstructorLayout({
  children,
  activePage,
  onNavigate,
  displayName,
  email,
  photoURL,
  onLogout,
}: InstructorLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-background border-r border-border/50">
      {/* Logo + Brand */}
      <div className="flex items-center gap-0 px-3 py-1 text-primary">
          <img src="/scholar-deet-logo.png" alt="Scholar Deet" className="h-28 w-28 shrink-0 dark:brightness-110 drop-shadow-sm" />
          <Typography variant="h6" className="font-black text-foreground -ml-5 tracking-tight">Scholar Deet</Typography>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 pt-0 pb-4 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id;
          return (
            <Button
              key={id}
              fullWidth
              onClick={() => {
                onNavigate(id);
                setMobileOpen(false);
              }}
              variant={isActive ? "contained" : "text"}
              className={`justify-start gap-3 h-11 px-4 rounded-xl text-sm font-bold normal-case transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            startIcon={<Icon fontSize="small" />}
            >
              {label}
            </Button>
          );
        })}
      </nav>

      {/* Bottom — User info + logout */}
      <div className="px-4 py-6 space-y-4 mt-auto">
        <Divider className="opacity-50" />
        
        <Button
            fullWidth
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            variant="outlined"
            className="flex items-center justify-center gap-2 h-11 rounded-xl border-border text-foreground hover:bg-muted normal-case font-bold"
            startIcon={theme === "dark" ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
        >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </Button>

        <div className="flex items-center gap-3 px-1">
          <Avatar
            src={photoURL}
            sx={{
              bgcolor: 'primary.main',
              width: 36,
              height: 36,
              fontSize: 14,
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {!photoURL && displayName.charAt(0).toUpperCase()}
          </Avatar>
          <div className="min-w-0">
            <Typography variant="body2" className="font-bold text-foreground truncate">{displayName}</Typography>
            <Typography variant="caption" className="text-muted-foreground truncate block font-medium opacity-70">{email}</Typography>
          </div>
        </div>

        <Button
          onClick={onLogout}
          fullWidth
          variant="text"
          color="error"
          className="justify-start gap-3 h-11 px-3 rounded-xl text-sm font-bold normal-case hover:bg-destructive/10"
          startIcon={<Logout fontSize="small" />}
        >
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col z-20">
        <SidebarContent />
      </aside>

      {/* Mobile drawer backdrop logic via MUI Drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        variant="temporary"
        sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260, border: 'none' },
        }}
      >
          <div className="h-full relative">
            <IconButton
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 z-10 text-muted-foreground hover:bg-muted"
                size="small"
            >
                <Close fontSize="small" />
            </IconButton>
            <SidebarContent />
          </div>
      </Drawer>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="flex items-center gap-2">
            <IconButton
                onClick={() => setMobileOpen(true)}
                className="text-foreground"
            >
                <MenuIcon />
            </IconButton>
            <div className="flex items-center">
                <img src="/scholar-deet-logo.png" alt="Scholar Deet" className="h-14 w-14" />
                <Typography variant="subtitle1" className="font-black text-foreground tracking-tight">Scholar Deet</Typography>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
