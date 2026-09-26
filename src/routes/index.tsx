import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import type { InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, Heart, Home, ListChecks, MapPin, Menu, MoreHorizontal,
  Plus, Search, Settings, Trash2, UserRound, UsersRound, X, Building2, Phone,
  Mail, Sparkles, Camera, Mic2, Music2, LogOut, HelpCircle, Info, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BBD — Event Operations" },
      { name: "description", content: "BBD keeps your team’s bookings, tasks, people, and revenue in one mobile workspace." },
      { property: "og:title", content: "BBD — Event Operations" },
      { property: "og:description", content: "Bookings, tasks, teams, and revenue for modern event teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ], links: [{ rel: "canonical", href: "/" }]
  }),
  component: App,
});

type Screen = "home" | "day" | "empty" | "add" | "event" | "team" | "bookings" | "tasks" | "eventTasks" | "completed" | "notifications" | "settings" | "revenue";
type NotificationItem = { id: string | number; title: string; desc: string; time: string; eventId?: number };
type Task = { id: string | number; title: string; person: string; priority: "High" | "Medium" | "Low"; due: string; done: boolean; eventId?: number; dbId?: string };

type EventItem = { id: number; dbId?: string; day: number; month: number; year: number; title: string; client: string; date: string; time: string; venue: string; budget: number; spent: number; people: number; status: string; hallName?: string; hallCost?: number; specialDemand?: string; extraActivities?: string[]; phone?: string; email?: string; contactPerson?: string; };

type TeamMember = { id: string; name: string; role: string; initials: string; online: boolean };

const initialTasks: Task[] = [
  { id: 1, title: "Confirm stage production setup", person: "Riya", priority: "High", due: "Today · 4:00 PM", done: false },
  { id: 2, title: "Share final guest list with venue", person: "Aryan", priority: "Medium", due: "Today · 6:00 PM", done: false },
  { id: 3, title: "Lock photographer arrival time", person: "Kabir", priority: "Low", due: "Tomorrow · 10:00 AM", done: false },
  { id: 4, title: "Client menu approval", person: "Ananya", priority: "Medium", due: "Completed yesterday", done: true },
];

const initialNotifications: NotificationItem[] = [
  { id: 1, title: "New booking assigned", desc: "Product Launch Night was added to your schedule", time: "2m", eventId: 1 },
  { id: 2, title: "Task reminder", desc: "Confirm stage production setup is due at 4:00 PM", time: "1h" },
  { id: 3, title: "Client message", desc: "“Please add a vegan menu option.”", time: "3h" },
  { id: 4, title: "Team update", desc: "Riya completed venue inspection", time: "Yesterday" }
];

function Logo() { return <div className="grid size-10 place-items-center rounded-lg border border-border bg-card text-sm font-bold">BBD</div>; }

// Helper: compute Indian FY label from a date string (YYYY-MM-DD)
function computeFyLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1; // 1-based
  const year = d.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = (fyStart + 1) % 100;
  return `${fyStart}-${String(fyEnd).padStart(2, "0")}`;
}

function getIndiaDateInputValue(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [drawer, setDrawer] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [toast, setToast] = useState("");
  const [selectedDay, setSelectedDay] = useState(24);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  
  // New state for setting password after invite
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const [userProfile, setUserProfile] = useState<{ name: string; role: string } | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    let mounted = true;
    
    // Check if the URL has a password recovery / invite query param or hash
    if (window.location.search.includes('invite=true') || window.location.hash.includes('type=invite') || window.location.hash.includes('type=recovery')) {
      setShowSetPassword(true);
    }

    const loadProfile = async (userId: string) => {
      const { data: profile } = await supabase.from('profiles').select('name').eq('id', userId).single();
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
      if (mounted) {
        setUserProfile({ 
          name: profile?.name || 'User', 
          role: roleData?.role || 'team_member' 
        });
      }
    };

    const loadTeamMembers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      const { data: profiles } = await supabase.from('profiles').select('id, name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      if (profiles && mounted) {
        const team = profiles.map(p => {
          const r = roles?.find(role => role.user_id === p.id);
          return {
            id: p.id,
            name: p.name || 'Unknown',
            role: r?.role || 'team_member',
            initials: (p.name || 'U').slice(0, 2).toUpperCase(),
            online: p.id === currentUserId || (p.name || 'U').length % 2 === 0,
          };
        });
        setMembers(team);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setLoggedIn(Boolean(data.session));
        setAuthLoading(false);
        if (data.session) {
          loadProfile(data.session.user.id);
          loadTeamMembers();
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session));
      setAuthLoading(false);
      if (_event === 'PASSWORD_RECOVERY') {
        setShowSetPassword(true);
      }
      if (session) {
        loadProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSetPassword = async () => {
    if (!newName.trim()) {
      notify("Please enter your name.");
      return;
    }
    if (newPassword.length < 6) {
      notify("Password must be at least 6 characters.");
      return;
    }
    setIsSettingPassword(true);
    
    // 1. Fetch current session to get user ID
    const { data: { session } } = await supabase.auth.getSession();
    
    // 2. Update profile FIRST to avoid race condition with onAuthStateChange listener
    if (session) {
      // First update Supabase auth metadata (this is what triggers the default profiles trigger, if it exists)
      await supabase.auth.updateUser({ data: { full_name: newName.trim(), name: newName.trim() } });
      
      // Then explicitly update our custom profiles table (using update instead of upsert just in case)
      const { error: profileError } = await supabase.from('profiles').update({ name: newName.trim() }).eq('id', session.user.id);
      
      if (profileError) {
        console.error("Failed to update profile name:", profileError);
      }
    }

    // 3. Update password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setIsSettingPassword(false);
      notify("Error: " + error.message);
      return;
    }

    // 4. Update local state immediately
    setUserProfile(prev => ({ name: newName.trim(), role: prev?.role || 'team_member' }));
    
    // 5. Reload all members so the list updates
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const currentUserId = currentSession?.user?.id;
    const { data: profiles } = await supabase.from('profiles').select('id, name');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    if (profiles) {
      const team = profiles.map(p => {
        const r = roles?.find(role => role.user_id === p.id);
        return {
          id: p.id,
          name: p.name || 'Unknown',
          role: r?.role || 'team_member',
          initials: (p.name || 'U').slice(0, 2).toUpperCase(),
          online: p.id === currentUserId || (p.name || 'U').length % 2 === 0,
        };
      });
      setMembers(team);
    }

    setIsSettingPassword(false);
    notify("Profile & Password set successfully!");
    setShowSetPassword(false);
    window.location.hash = ""; // clear hash
    window.history.replaceState({}, document.title, window.location.pathname); // clear query params like ?invite=true
  };

  // Load bookings from Supabase
  useEffect(() => {
    if (!loggedIn) return;

    const loadBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_name, event_type, event_date, event_time, venue_text, total_budget, spent_amount, people_count, status, hall_name, hall_cost, special_demand, extra_activities, phone, email, contact_person")
        .order("event_date", { ascending: true });
      if (error) { console.error("Load bookings error:", error); return; }
      if (data) {
        const loadedEvents = data.map((b, i) => ({
          id: i + 1,
          dbId: b.id,
          day: new Date(b.event_date).getDate(),
          month: new Date(`${b.event_date}T00:00:00Z`).getUTCMonth() + 1,
          year: new Date(`${b.event_date}T00:00:00Z`).getUTCFullYear(),
          title: b.event_type,
          client: b.client_name,
          date: new Date(b.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          time: b.event_time ? b.event_time.slice(0, 5) : "",
          venue: b.venue_text,
          budget: Number(b.total_budget),
          spent: Number(b.spent_amount),
          people: b.people_count,
          status: b.status,
          hallName: b.hall_name,
          hallCost: Number(b.hall_cost || 0),
          specialDemand: b.special_demand || undefined,
          extraActivities: Array.isArray(b.extra_activities) ? b.extra_activities as string[] : [],
          phone: b.phone || undefined,
          email: b.email || undefined,
          contactPerson: b.contact_person || undefined,
        }));
        setEvents(loadedEvents);

        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('id, title, due_date, status, priority, booking_id');
        if (!tasksError && tasksData) {
          setTasks(tasksData.map(t => ({
             id: t.id,
             dbId: t.id,
             title: t.title,
             person: 'Team',
             priority: t.priority === 'high' ? 'High' : t.priority === 'low' ? 'Low' : 'Medium',
             due: new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
             done: t.status === 'done',
             eventId: loadedEvents.find(e => e.dbId === t.booking_id)?.id
          })));
        }

        // Fetch notifications
        const { data: notifData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
        if (notifData) {
           setNotifications(notifData.map(n => {
              const parts = n.type.split(':');
              const evDbId = parts[0] === 'booking' ? parts[1] : undefined;
              return {
                 id: n.id,
                 title: n.title,
                 desc: n.description,
                 time: new Date(n.created_at).toLocaleDateString(),
                 eventId: evDbId ? loadedEvents.find(e => e.dbId === evDbId)?.id : undefined
              };
           }));
        }
      }
    };
    loadBookings();
    // Real-time: reload when bookings change
    const channel = supabase
      .channel("app-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, loadBookings)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, loadBookings)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, loadBookings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loggedIn]);

  const navigate = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2200); };

  const handleAddNotification = async (n: { title: string, desc: string, eventDbId?: string }) => {
     const typeStr = n.eventDbId ? `booking:${n.eventDbId}` : 'general';
     const promises = members.map(m => supabase.from('notifications').insert({
         recipient_id: m.id,
         type: typeStr,
         title: n.title,
         description: n.desc
     }));
     await Promise.all(promises);
  };

  if (authLoading) return <div className="grid min-h-dvh place-items-center bg-[#07080c] text-sm text-muted-foreground">Loading your account...</div>;

  if (!loggedIn) {
    if (showSetPassword && window.location.hash.includes('error=')) {
      // The link expired or was invalid
      return (
        <div className="grid min-h-dvh place-items-center bg-[#07080c] p-4 text-center">
          <div className="max-w-sm space-y-4">
            <h2 className="text-xl font-bold text-red-500">Link Expired</h2>
            <p className="text-sm text-muted-foreground">This invite link has already been used or has expired. Please ask your administrator for a new one.</p>
            <Button onClick={() => window.location.href = '/'}>Go to Login</Button>
          </div>
        </div>
      );
    }
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  // Render Set Password Modal over everything if active AND logged in (session valid)
  if (showSetPassword && loggedIn) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in">
          <h3 className="mb-2 text-xl font-bold">Welcome to BBD!</h3>
          <p className="mb-6 text-sm text-muted-foreground">Please set a secure password for your new account to continue.</p>
          <input 
            type="text" 
            value={newName} 
            onChange={e => setNewName(e.target.value)} 
            placeholder="Enter your full name" 
            className="mb-3 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-hidden border border-border focus:border-rose/50" 
          />
          <input 
            type="password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            placeholder="Enter new password" 
            className="mb-4 w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-hidden border border-border focus:border-rose/50" 
          />
          <Button className="w-full" onClick={handleSetPassword} disabled={isSettingPassword}>
            {isSettingPassword ? "Saving..." : "Set Password & Continue"}
          </Button>
        </div>
        {toast && <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg border border-border bg-foreground px-4 py-3 text-sm font-semibold text-background">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background lg:flex">
      
      {/* Desktop Sidebar (Fixed on the far left) */}
      <div className="hidden lg:block w-[320px] shrink-0 h-dvh sticky top-0 border-r border-border bg-background shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-40 overflow-y-auto no-scrollbar">
        <DrawerContent 
          events={events} 
          currentScreen={screen} 
          onNavigate={(target) => navigate(target)} 
          userProfile={userProfile} 
          onSignOut={() => { void supabase.auth.signOut(); setLoggedIn(false); }} 
          members={members}
        />
      </div>

      {/* Main Content Area (Centered in remaining space) */}
      <div className="flex-1 flex justify-center bg-[#07080c]/50 relative">
        <main className="relative min-h-dvh w-full max-w-[480px] border-x border-border/80 bg-background pb-20 shadow-2xl">
          {screen === "home" && <HomeScreen events={events} onMenu={() => setDrawer(true)} onNavigate={navigate} setSelectedDay={setSelectedDay} onEventSelect={(id) => { setSelectedEventId(id); navigate("event"); }} />}
          {screen === "day" && <DayScreen events={events} day={selectedDay} onBack={() => navigate("home")} onNavigate={navigate} onEventSelect={(id) => { setSelectedEventId(id); navigate("event"); }} />}
          {screen === "empty" && <EmptyDay day={selectedDay} onBack={() => navigate("home")} onAdd={() => navigate("add")} />}
          {screen === "add" && <AddBooking onBack={() => navigate("home")} onSave={(event) => { if (event) { setEvents((current) => [...current, event]); handleAddNotification({ title: "New booking assigned", desc: `Booking #${event.id} taken by admin`, eventDbId: event.dbId }); } notify("Booking saved"); navigate("home"); }} notify={notify} />}
          {screen === "event" && <EventDetails event={events.find(e => e.id === selectedEventId)} onBack={() => navigate("bookings")} onNavigateDay={(day) => { setSelectedDay(day); navigate("day"); }} tasks={tasks.filter(t => t.eventId === selectedEventId)} members={members} onNavigateTasks={() => navigate("eventTasks")} />}
          {screen === "team" && (userProfile?.role === "admin" ? <TeamScreen onMenu={() => setDrawer(true)} notify={notify} members={members} /> : <div className="p-10 text-center text-muted-foreground">Access Denied</div>)}
          {screen === "bookings" && <BookingsScreen events={events} onMenu={() => setDrawer(true)} onNavigate={navigate} onEventSelect={(id) => { setSelectedEventId(id); navigate("event"); }} />}
          {screen === "tasks" && <BookingsScreen title="Tasks" subtitle="Select an event to view tasks" events={events} onMenu={() => setDrawer(true)} onNavigate={navigate} onEventSelect={(id) => { setSelectedEventId(id); navigate("eventTasks"); }} />}
          {screen === "eventTasks" && <TasksScreen onBack={() => navigate("tasks")} tasks={tasks} setTasks={setTasks} onArchive={() => navigate("completed")} selectedEventId={selectedEventId} selectedEventDbId={events.find(e => e.id === selectedEventId)?.dbId} userProfile={userProfile} addNotification={(n) => handleAddNotification({ title: n.title, desc: n.desc, eventDbId: events.find(e => e.id === selectedEventId)?.dbId })} />}
          {screen === "completed" && <CompletedScreen tasks={tasks.filter(t => t.eventId === selectedEventId)} onBack={() => navigate("eventTasks")} />}
          {screen === "notifications" && <NotificationsScreen onBack={() => navigate("home")} notifications={notifications} onNavigateEvent={(id) => { setSelectedEventId(id); navigate("event"); }} />}
          {screen === "settings" && <SettingsScreen onMenu={() => setDrawer(true)} userProfile={userProfile} />}
          {screen === "revenue" && (userProfile?.role === "admin" ? <RevenueScreen onBack={() => navigate("home")} /> : <div className="p-10 text-center text-muted-foreground">Access Denied</div>)}
        </main>
      </div>
      
      {drawer && <Drawer events={events} currentScreen={screen} onClose={() => setDrawer(false)} onNavigate={(target) => { setDrawer(false); navigate(target); }} userProfile={userProfile} onSignOut={() => { void supabase.auth.signOut(); setLoggedIn(false); }} members={members} />}
      {toast && <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg border border-border bg-foreground px-4 py-3 text-sm font-semibold text-background">{toast}</div>}
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const demoEmail = "demo@bbd.com";
  const demoPassword = "123456";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    let { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // Bootstrap the shared demo account when it does not exist yet.
    if (loginError && normalizedEmail === demoEmail && password === demoPassword) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPassword,
      });
      if (!signUpError) {
        const result = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });
        loginError = result.error;
      } else {
        loginError = signUpError;
      }
    }

    if (loginError) {
      setError(loginError.message.includes("confirmation")
        ? "Demo account created. Disable email confirmation in Supabase Auth, then try again."
        : loginError.message);
    } else {
      onLogin();
    }
    setLoading(false);
  };

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden border-x border-border bg-[#07080c] px-6 pb-8 pt-8">
      {/* Background ambient texture circles */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border border-white/[0.04] bg-radial from-white/[0.04] via-electric/[0.02] to-transparent" />
      <div className="pointer-events-none absolute -left-28 -bottom-28 size-96 rounded-full border border-white/[0.03] bg-radial from-white/[0.03] to-transparent" />

      {/* Faint crosshair accent */}
      <span className="pointer-events-none absolute left-8 top-1/3 select-none font-mono text-xs text-white/10">+</span>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="h-4 w-px bg-border/70" />
          <span className="text-lg font-bold tracking-tight text-foreground">BBD</span>
        </div>
        <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">
          PLAN &nbsp;/&nbsp; MANAGE &nbsp;/&nbsp; EXECUTE
        </div>
      </header>

      {/* Main Form Content */}
      <div className="relative z-10 my-auto py-12">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-0.5 w-6 rounded-full bg-electric" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">
            PLAN &nbsp;/&nbsp; MANAGE &nbsp;/&nbsp; EXECUTE
          </span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          Welcome <span className="font-bold text-muted-foreground/60">Back.</span>
        </h1>
        <p className="mt-2.5 text-sm text-muted-foreground/80">
          Sign in to continue to your team account.
        </p>

        <form className="mt-9 space-y-5" onSubmit={login}>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-foreground/90">Email</span>
              <div className="group flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-[#12141c]/90 px-4 focus-within:border-electric/70 focus-within:bg-[#151824]">
                <Mail className="size-4 text-muted-foreground/70" />
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-foreground outline-hidden placeholder:text-muted-foreground/40" />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-foreground/90">Password</span>
              <div className="group flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-[#12141c]/90 px-4 focus-within:border-electric/70 focus-within:bg-[#151824]">
                <span className="text-sm text-muted-foreground/70">*</span>
                <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-foreground outline-hidden placeholder:text-muted-foreground/40" />
              </div>
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={loading || !email || !password} className="relative group flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-r from-secondary/90 via-secondary/70 to-secondary/90 px-4 text-sm font-semibold text-foreground shadow-lg transition-all hover:border-white/25 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50">
              <span className="relative z-10 flex items-center justify-center gap-2">{loading ? "Logging in..." : "Login"} <ArrowRight className="size-4" /></span>
            </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-auto flex items-center justify-center gap-4 pt-6 text-xs text-muted-foreground/70">
        <span className="h-px w-16 bg-white/10" />
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <UserRound className="size-3.5 text-muted-foreground/60" />
          <span>Invite your team</span>
        </div>
        <span className="h-px w-16 bg-white/10" />
      </footer>
    </main>
  );
}

function Header({ title, subtitle, back, onMenu, right }: { title: string; subtitle?: string; back?: () => void; onMenu?: (() => void) | undefined; right?: React.ReactNode }) {
  return <header className="sticky top-0 z-10 grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-sm">
    {back ? <Button variant="icon" aria-label="Go back" onClick={back}><ArrowLeft /></Button> : onMenu ? <Button variant="icon" aria-label="Open menu" onClick={onMenu} className="lg:hidden"><Menu /></Button> : <div className="w-10" />}
    <div className="min-w-0"><h1 className="truncate text-xl font-bold">{title}</h1>{subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}</div><div>{right}</div>
  </header>;
}

function HomeScreen({ events, onMenu, onNavigate, setSelectedDay, onEventSelect }: { events: EventItem[]; onMenu: () => void; onNavigate: (s: Screen) => void; setSelectedDay: (d: number) => void; onEventSelect: (id: number) => void }) {
  const today = getIndiaDateInputValue();
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(Date.UTC(todayYear, todayMonth - 1, 1)));
  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth() + 1;
  const marked = new Set(events.filter(e => e.year === year && e.month === month).map(e => e.day));
  const firstOffset = visibleMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthTitle = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(visibleMonth);
  const changeMonth = (offset: number) => {
    setVisibleMonth(current => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1)));
  };
  const isCurrentMonth = year === todayYear && month === todayMonth;
  return <><header className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4"><Button variant="icon" aria-label="Open menu" onClick={onMenu} className="lg:hidden"><Menu /></Button><div className="min-w-0"><p className="text-xs text-muted-foreground">Good morning</p><h1 className="truncate text-lg font-bold">Team BBD</h1></div><div className="flex"><Button variant="icon" aria-label="Notifications" onClick={() => onNavigate("notifications")} className="relative"><Bell /><span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" /></Button><div className="grid size-10 place-items-center self-center rounded-full bg-secondary text-xs font-bold">AG</div></div></header>
    <div className="space-y-8 px-4"><section className="premium-surface relative overflow-hidden rounded-2xl border p-5"><div className="absolute -right-10 -top-12 size-36 rounded-full border border-electric/20" /><div className="absolute -bottom-16 -left-12 size-36 rounded-full border border-rose/15" /><div className="relative mb-5 flex items-center justify-between"><div><p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4 text-electric" />Team calendar</p><h2 className="mt-2 text-xl font-semibold">{monthTitle}</h2></div><div className="flex gap-1"><Button variant="icon" aria-label="Previous month" onClick={() => changeMonth(-1)} className="border border-border bg-secondary/60"><ChevronLeft /></Button><Button variant="icon" aria-label="Next month" onClick={() => changeMonth(1)} className="border border-border bg-secondary/60"><ChevronRight /></Button></div></div><div className="relative grid grid-cols-7 text-center">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={`${d}${i}`} className="pb-3 text-xs text-muted-foreground">{d}</span>)}{Array.from({ length: firstOffset }).map((_, i) => <span key={`x${i}`} />)}{Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => <button key={day} onClick={() => { setSelectedDay(day); onNavigate(marked.has(day) ? "day" : "empty"); }} className="relative flex min-h-12 flex-col items-center justify-center rounded-lg text-sm"><span className={cn("grid size-8 place-items-center rounded-full", isCurrentMonth && day === todayDay && "active-glow font-semibold text-foreground")}>{day}</span>{marked.has(day) && <Heart className="absolute bottom-0 size-2.5 fill-destructive text-destructive" />}</button>)}</div></section>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-5 text-electric" />Upcoming events</h2><button onClick={() => onNavigate("bookings")} className="min-h-11 text-sm text-muted-foreground">View all ›</button></div>{events.length > 0 ? <div className="space-y-3">{events.slice(0, 3).map(e => <BookingRow key={e.id} event={e} onClick={() => onEventSelect(e.id)} />)}</div> : <Empty title="No bookings yet" text="Add your first booking to get started" />}</section></div></>;
}

function BookingRow({ event, onClick }: { event: EventItem; onClick: () => void }) { return <button onClick={onClick} className="event-surface grid min-h-[96px] w-full grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border p-4 text-left"><div className="grid h-16 place-items-center rounded-xl border border-electric/30 bg-electric/10"><span className="font-mono text-xl font-semibold">{event.day}</span><span className="-mt-3 text-[10px] text-muted-foreground">SEP</span></div><div className="min-w-0"><p className="truncate font-semibold">{event.title} <span className="inline-block size-1.5 rounded-full bg-destructive" /></p><p className="mt-1 truncate text-xs text-muted-foreground">{event.client}</p><p className="mt-1 truncate text-xs text-muted-foreground">{event.time} · {event.venue}</p></div><ChevronRight className="size-5 text-muted-foreground" /></button>; }

function DayScreen({ events, day, onBack, onNavigate, onEventSelect }: { events: EventItem[]; day: number; onBack: () => void; onNavigate: (s: Screen) => void; onEventSelect: (id: number) => void }) {
  const e = events.find(x => x.day === day);
  if (!e) {
    return <EmptyDay day={day} onBack={onBack} onAdd={() => onNavigate("add")} />;
  }
  const pct = Math.round(e.spent / e.budget * 100);
  return <><Header back={onBack} title={`${e.date}`} subtitle="Team Calendar" /><div className="space-y-4 px-4 py-5">
    <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5"><div className="absolute inset-x-0 top-0 h-1 bg-foreground" /><span className="text-xs font-semibold text-muted-foreground">BOOKING</span><h2 className="mt-8 text-2xl font-bold">{e.title} <span className="inline-block size-2 rounded-full bg-destructive" /></h2><p className="mt-2 text-sm text-muted-foreground">For {e.client}</p><div className="mt-5 flex items-center gap-2 text-sm"><Clock3 className="size-4" />{e.time}</div></section>
    <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card py-4 text-center"><Quick label="Date" value={`${e.day}`} /><Quick label="Location" value={e.venue.split(",")[0] || e.venue} /><Quick label="Guests" value={`${e.people}`} /></div>
    <InfoCard title="Client Details"><Detail icon={<UserRound />} title={e.client} text={e.contactPerson || "Primary client"} /><Detail icon={<Phone />} title={e.phone || "+91 98765 43210"} text="Phone" /><Detail icon={<Mail />} title={e.email || "N/A"} text="Email" />{e.specialDemand && <blockquote className="mt-4 border-l border-foreground pl-3 text-sm text-muted-foreground">{`"${e.specialDemand}"`}</blockquote>}</InfoCard>
    <InfoCard title="Venue Details"><Detail icon={<Building2 />} title={e.venue} text="Location" /><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><Quick label="Hall" value={e.hallName || "Main"} /><Quick label="Cost" value={`₹${((e.hallCost || 0) / 100000).toFixed(1)}L`} /><Quick label="Capacity" value={`${e.people}`} /></div></InfoCard>
    <InfoCard title="Budget"><p className="font-mono text-2xl font-semibold">₹{(e.budget / 100000).toFixed(1)}L</p><div className="my-4 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-foreground" style={{ width: `${pct}%` }} /></div><div className="grid grid-cols-2"><Quick label="Spent" value={`₹${(e.spent / 100000).toFixed(2)}L`} /><Quick label="Remaining" value={`₹${((e.budget - e.spent) / 100000).toFixed(2)}L`} /></div></InfoCard>
    {e.specialDemand && <InfoCard title="Special Demands"><div className="flex gap-2 overflow-x-auto no-scrollbar">{e.specialDemand.split(",").map((d, i) => <Chip key={i}>{d.trim()}</Chip>)}</div></InfoCard>}
    {e.extraActivities && e.extraActivities.length > 0 && <InfoCard title="Extra Activity"><div className="flex gap-2 flex-wrap">{e.extraActivities.map((a, i) => <Chip key={i}><Music2 /> {a}</Chip>)}</div></InfoCard>}
    <Button className="mt-6 w-full" onClick={() => onNavigate("tasks")}>Manage Tasks <ChevronRight /></Button>
  </div></>;
}

function EmptyDay({ day, onBack, onAdd }: { day: number; onBack: () => void; onAdd: () => void }) {

  return (
    <div className="relative min-h-dvh bg-[#07080c] overflow-hidden">
      {/* Background ambient texture circles (electric blue top-right, rose red bottom-left) */}
      <div className="pointer-events-none absolute -right-28 -top-28 size-[420px] rounded-full border border-electric/20 bg-radial from-electric/15 via-electric/5 to-transparent" />
      <div className="pointer-events-none absolute -left-28 bottom-12 size-[420px] rounded-full border border-rose/15 bg-radial from-rose/12 via-rose/5 to-transparent" />

      <Header back={onBack} title="Team Day" subtitle={`${day} September · No bookings`} right={<Button variant="ghost" className="px-2 border border-white/10 bg-secondary/50 text-xs font-medium">Team <ChevronDown className="size-3.5" /></Button>} />

      <div className="relative z-10 px-4 py-8 space-y-8">
        {/* Main Empty State Banner Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/60 p-8 text-center shadow-xl backdrop-blur-md animate-in fade-in duration-300">
          <div className="pointer-events-none absolute -right-16 -top-16 size-36 rounded-full border border-electric/20 bg-radial from-electric/15 to-transparent" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 size-36 rounded-full border border-rose/20 bg-radial from-rose/15 to-transparent" />

          {/* Icon Badge */}
          <div className="relative mx-auto grid size-20 place-items-center rounded-2xl border border-electric/40 bg-gradient-to-br from-electric/20 via-card to-rose/20 shadow-[0_0_28px_rgba(99,102,241,0.25)] transition-transform hover:scale-105">
            <CalendarDays className="size-9 text-electric" />
          </div>

          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">
            No Booking for this Day
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted-foreground/80">
            The team calendar is clear. Add a booking to start planning.
          </p>

          <button
            onClick={onAdd}
            className="group relative mt-6 inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-electric/40 bg-gradient-to-r from-electric/25 via-secondary/80 to-rose/25 px-6 py-3.5 text-xs font-semibold text-foreground shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all hover:border-rose/50 hover:shadow-[0_0_28px_rgba(244,63,94,0.35)] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
            <CalendarDays className="size-4 text-electric transition-transform group-hover:scale-110" />
            <span>Add New Booking</span>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </button>
        </div>


      </div>

      {/* Floating Glowing Add Button */}
      <button
        onClick={onAdd}
        aria-label="Add booking"
        className="group fixed bottom-6 right-6 z-20 flex size-14 items-center justify-center rounded-full border border-electric/40 bg-gradient-to-br from-electric/30 via-card to-rose/30 text-foreground shadow-[0_0_24px_rgba(99,102,241,0.4)] transition-all hover:border-rose/50 hover:shadow-[0_0_32px_rgba(244,63,94,0.5)] active:scale-95"
      >
        <Plus className="size-6 text-foreground transition-transform group-hover:rotate-90" />
      </button>
    </div>
  );
}

function AddBooking({ onBack, onSave, notify }: { onBack: () => void; onSave: (event?: EventItem) => void; notify: (text: string) => void }) {
  const [activity, setActivity] = useState("DJ");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [venue, setVenue] = useState("");
  const [eventType, setEventType] = useState("Corporate Retreat");
  const [eventDate, setEventDate] = useState(getIndiaDateInputValue);
  const [advPayment, setAdvPayment] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [hallName, setHallName] = useState("");
  const [hallCost, setHallCost] = useState("");
  const [people, setPeople] = useState("");
  const [specialDemand, setSpecialDemand] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const peopleCount = Number(people);
    if (!name.trim() || phone.replace(/\D/g, "").length < 7 || !venue.trim() || !eventDate || !hallName.trim() || !Number.isInteger(peopleCount) || peopleCount < 1) {
      setError(true);
      notify("Please fill all required booking details.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fyLabel = computeFyLabel(eventDate);
      if (!user) {
        if (sessionStorage.getItem("bbd-demo-login") !== "true") {
          throw new Error("Please sign in with your Supabase account to save bookings.");
        }
        const localBooking: EventItem = {
          id: Date.now(),
          day: new Date(`${eventDate}T00:00:00Z`).getUTCDate(),
          month: new Date(`${eventDate}T00:00:00Z`).getUTCMonth() + 1,
          year: new Date(`${eventDate}T00:00:00Z`).getUTCFullYear(),
          title: eventType,
          client: name.trim(),
          date: new Date(`${eventDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          time: "",
          venue: venue.trim(),
          budget: Number(totalBudget) || 0,
          spent: 0,
          people: peopleCount,
          status: "upcoming",
        };
        onSave(localBooking);
        setSaving(false);
        return;
      }
      const { data: insertedBooking, error: insertError } = await supabase.from("bookings").insert({
        client_name: name.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        event_type: eventType,
        event_date: eventDate,
        fy_label: fyLabel,
        venue_text: venue.trim(),
        advance_payment: Number(advPayment) || 0,
        total_budget: Number(totalBudget) || 0,
        hall_name: hallName.trim(),
        hall_cost: Number(hallCost) || 0,
        people_count: peopleCount,
        special_demand: specialDemand.trim() || null,
        extra_activities: activity ? (activityDetails.trim() ? [`${activity}: ${activityDetails.trim()}`] : [activity]) : (activityDetails.trim() ? [activityDetails.trim()] : []),
        status: "upcoming",
        created_by: user.id,
      }).select().single();
      if (insertError) {
        console.error("Insert error:", insertError);
        setError(true);
        setSaving(false);
        notify(insertError.message || "Error saving booking. Please try again.");
        return;
      }
      
      const newEvent: EventItem = {
        id: insertedBooking.id, // note: EventItem id is number but we might have uuid, but for eager state it's fine since it reloads
        day: new Date(insertedBooking.event_date).getDate(),
        month: new Date(`${insertedBooking.event_date}T00:00:00Z`).getUTCMonth() + 1,
        year: new Date(`${insertedBooking.event_date}T00:00:00Z`).getUTCFullYear(),
        title: insertedBooking.event_type,
        client: insertedBooking.client_name,
        date: new Date(insertedBooking.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        time: insertedBooking.event_time ? insertedBooking.event_time.slice(0, 5) : "",
        venue: insertedBooking.venue_text,
        budget: Number(insertedBooking.total_budget),
        spent: Number(insertedBooking.spent_amount),
        people: insertedBooking.people_count,
        status: insertedBooking.status,
      } as any;
      
      onSave(newEvent);
    } catch (err) {
      console.error("Save booking error:", err);
      setError(true);
      notify(err instanceof Error ? err.message : "Error saving booking. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="relative min-h-dvh bg-[#07080c] overflow-hidden">
      {/* Background ambient texture circles (bluish top-right, reddish bottom-left) */}
      <div className="pointer-events-none absolute -right-28 -top-28 size-[420px] rounded-full border border-electric/20 bg-radial from-electric/15 via-electric/5 to-transparent" />
      <div className="pointer-events-none absolute -left-28 bottom-10 size-[420px] rounded-full border border-rose/15 bg-radial from-rose/12 via-rose/5 to-transparent" />

      <Header back={onBack} title="Add New Booking" subtitle="Create a team event" />

      <form
      id="booking-form"
        className="relative z-10 space-y-6 px-4 py-6 pb-36"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <FormSection
          icon={<UserRound className="size-5 text-electric" />}
          title="Client Details"
          subtitle="Enter the client's information"
        >
          <Field
            label="Client Name *"
            icon={<UserRound />}
            value={name}
            onChange={setName}
            placeholder="Full name"
            error={error && !name.trim()}
          />
          <Field label="Contact Person" icon={<UserRound />} value={contactPerson} onChange={setContactPerson} placeholder="Optional" />
          <Field
            label="Phone Number *"
            icon={<Phone />}
            value={phone}
            onChange={setPhone}
            placeholder="98765 43210"
            prefix="+91"
            error={error && phone.length < 7}
          />
          <Field
            label="Email"
            icon={<Mail />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="client@example.com"
          />
        </FormSection>

        <FormSection
          icon={<CalendarDays className="size-5 text-rose" />}
          title="Event Details"
          subtitle="What and when is the event?"
        >
          <SelectField
            label="Event Type *"
            icon={<Building2 />}
            value={eventType}
            onChange={setEventType}
            options={[
              "Corporate Retreat",
              "Product Launch",
              "Annual Meet",
              "Client Dinner",
              "Wedding",
              "Birthday",
              "Conference",
              "Other",
            ]}
          />
          <Field label="Date *" icon={<CalendarDays />} type="date" value={eventDate} onChange={setEventDate} />
        </FormSection>

        <FormSection
          icon={<MapPin className="size-5 text-electric" />}
          title="Venue"
          subtitle="Write below or pick a saved venue"
        >
          <label className="text-xs font-medium text-muted-foreground/80">Saved Venues</label>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <Chip>The Grand Hotel · Delhi</Chip>
            <Chip>The Park · Jaipur</Chip>
            <Chip>Taj Palace · Mumbai</Chip>
          </div>
          <Field
            label="Venue Name & Address *"
            icon={<MapPin />}
            textarea
            value={venue}
            onChange={setVenue}
            placeholder="The Grand Hotel, Connaught Place, New Delhi…"
            error={error && !venue.trim()}
          />
          <p className="text-xs leading-5 text-muted-foreground/70">
            New venues are saved as suggestions for future bookings.
          </p>
        </FormSection>

        <FormSection
          icon={<CircleDollarSign className="size-5 text-rose" />}
          title="Budget"
          subtitle="Advance payment and estimated total"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Advance Payment" prefix="₹" inputMode="numeric" placeholder="0" value={advPayment} onChange={setAdvPayment} />
            <Field label="Total Budget *" prefix="₹" inputMode="numeric" placeholder="0" value={totalBudget} onChange={setTotalBudget} />
          </div>
        </FormSection>

        <FormSection
          icon={<Building2 className="size-5 text-electric" />}
          title="Hall Details"
          subtitle="Venue capacity and cost"
        >
          <Field label="Place / Hall Name *" placeholder="Regency Hall" value={hallName} onChange={setHallName} error={error && !hallName.trim()} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost *" prefix="₹" value={hallCost} onChange={setHallCost} />
            <Field label="No. of People *" inputMode="numeric" value={people} onChange={setPeople} error={error && !people} />
          </div>
        </FormSection>

        <FormSection
          icon={<Sparkles className="size-5 text-rose" />}
          title="Special Demand"
          subtitle="Specific client requirements"
        >
          <Field label="Requirements" textarea placeholder="Menu, stage, accessibility (comma separated for multiple)…" value={specialDemand} onChange={setSpecialDemand} />
        </FormSection>

        <FormSection
          icon={<Music2 className="size-5 text-electric" />}
          title="Extra Activity"
          subtitle="Entertainment and add-ons"
        >
          <ActivityPicker active={activity} onChange={setActivity} />
          <Field label="Activity details" placeholder="Name, time, genre (comma separated for multiple)…" value={activityDetails} onChange={setActivityDetails} />
        </FormSection>
      </form>

      {/* Floating Glowing Dual Gradient Create Booking CTA */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-white/10 bg-[#07080c]/90 px-4 py-3 backdrop-blur-xl">
        <button
          type="submit"
          form="booking-form"
          disabled={saving}
          className="relative group flex min-h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border border-electric/40 bg-gradient-to-r from-electric/25 via-[#121420] to-rose/25 px-6 text-sm font-semibold text-foreground shadow-[0_0_24px_rgba(99,102,241,0.25)] transition-all hover:border-rose/50 hover:shadow-[0_0_32px_rgba(244,63,94,0.35)] active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-electric/20 text-electric font-bold text-xs">
              +
            </span>
            {saving ? "Saving booking..." : "Create Booking"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );
}

function EventDetails({ event: e, onBack, onNavigateDay, tasks, members, onNavigateTasks }: { event: EventItem | undefined; onBack: () => void; onNavigateDay: (day: number) => void; tasks: Task[]; members: TeamMember[]; onNavigateTasks: () => void }) {
  const [tab, setTab] = useState("Overview");

  if (!e) {
    return <><Header back={onBack} title="Event Details" subtitle="BBD" /><div className="px-4 py-5"><Empty title="No event found" text="This event no longer exists" /></div></>;
  }

  return <><Header back={onBack} title="Event Details" subtitle={`BBD · Booking #${e.id || "2409"}`} /><div className="px-4 py-5"><div><span className="text-xs text-muted-foreground uppercase">EVENT DETAILS</span><h2 className="mt-2 text-2xl font-bold">{e.title} <span className="inline-block size-2 rounded-full bg-destructive" /></h2><p className="mt-2 text-sm text-muted-foreground">{e.client} · {e.date} · {e.time}</p><p className="mt-1 text-sm text-muted-foreground">{e.venue}</p><AvatarStack members={members} /></div><Tabs items={["Overview", "Tasks", "Team"]} active={tab} setActive={setTab} />{tab === "Overview" && <div className="space-y-4"><InfoCard title="Client"><Detail icon={<UserRound />} title={e.client} text="+91 98765 43210" /></InfoCard><InfoCard title="Event Summary"><Detail icon={<CalendarDays />} title={e.date} text={`${e.time} · ${e.people} guests`} /><Detail icon={<MapPin />} title={e.venue} text="Location" /></InfoCard><Button className="w-full" onClick={() => onNavigateDay(e.day)}>View All Details <ChevronRight /></Button></div>}{tab === "Tasks" && <div className="space-y-4"><TaskList tasks={tasks} />{tasks.length === 0 && <Empty title="No tasks" text="There are no tasks for this booking yet." />}<Button className="w-full" onClick={onNavigateTasks}>Add / Manage Tasks <ChevronRight /></Button></div>}{tab === "Team" && <div className="space-y-3">{members.map(m => <MemberRow key={m.id} member={m} />)}</div>}</div></>;
}

function TeamScreen({ onMenu, notify, members }: { onMenu?: () => void; notify: (s: string) => void; members: TeamMember[] }) { 
  const [filter, setFilter] = useState("All"); 
  const [query, setQuery] = useState(""); 
  
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_member");
  const [isInviting, setIsInviting] = useState(false);

  const shown = members.filter(m => (filter === "All" || (filter === "Online" ? m.online : !m.online)) && m.name.toLowerCase().includes(query.toLowerCase())); 

  const [generatedLink, setGeneratedLink] = useState("");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setGeneratedLink("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("invite_user", {
        body: { email: inviteEmail, role: inviteRole },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (error) throw new Error(error.message);
      if (data && data.error) throw new Error(data.error);
      
      notify("User profile created securely!");
      if (data?.link) {
        setGeneratedLink(data.link);
      } else {
        setShowInviteDialog(false);
        setInviteEmail("");
      }
    } catch (err: any) {
      notify("Error: " + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <>
      <Header 
        onMenu={onMenu} 
        title="Team" 
        subtitle={`${members.length} members`} 
        right={<Button variant="icon" aria-label="Add team member" onClick={() => { setShowInviteDialog(true); setGeneratedLink(""); }}><Plus /></Button>} 
      />
      
      <div className="space-y-5 px-4 py-5">
        <div className="flex min-h-12 items-center gap-3 rounded-lg bg-secondary px-3">
          <Search className="size-4 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search team" className="min-w-0 flex-1 bg-transparent text-sm outline-hidden" />
        </div>
        
        <Tabs items={["All", "Online", "Offline"]} active={filter} setActive={setFilter} />
        
        <div className="space-y-3">
          {shown.length ? shown.map(m => <MemberRow key={m.name} member={m} />) : <Empty title="No team members found" text="Try another search or filter." />}
        </div>
      </div>

      {showInviteDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowInviteDialog(false)}>
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="rounded-t-3xl border border-border bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Invite Team Member</h3>
                <Button variant="icon" aria-label="Close" onClick={() => setShowInviteDialog(false)}>
                  <X />
                </Button>
              </div>
              
              {!generatedLink ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Email Address</label>
                    <input 
                      type="email" 
                      value={inviteEmail} 
                      onChange={e => setInviteEmail(e.target.value)} 
                      placeholder="colleague@example.com" 
                      className="w-full rounded-lg bg-secondary px-4 py-3 text-sm outline-hidden border border-border focus:border-rose/50" 
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Role</label>
                    <select 
                      value={inviteRole} 
                      onChange={e => setInviteRole(e.target.value)} 
                      className="w-full rounded-lg bg-secondary px-4 py-3 text-sm outline-hidden border border-border focus:border-rose/50"
                    >
                      <option value="team_member">Team Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <Button className="w-full mt-2" onClick={handleInvite} disabled={isInviting}>
                    {isInviting ? "Creating Invite..." : "Generate Invite Link"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-green-500 font-medium">User account securely generated!</p>
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Share this secure link with the user:</label>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={generatedLink} 
                        className="w-full rounded-lg bg-secondary px-4 py-3 text-xs outline-hidden border border-border" 
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(generatedLink); notify("Link copied!"); }}>Copy</Button>
                    </div>
                  </div>
                  <Button className="w-full mt-2" onClick={() => { setShowInviteDialog(false); setInviteEmail(""); setGeneratedLink(""); }}>Done</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  ); 
}
function BookingsScreen({ events, onMenu, onNavigate, onEventSelect, title = "Bookings", subtitle = "All team events" }: { events: EventItem[]; onMenu?: () => void; onNavigate: (s: Screen) => void; onEventSelect: (id: number) => void; title?: string; subtitle?: string }) {
  const [tab, setTab] = useState("All");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredEvents = events.filter(e => {
    if (tab === "All") return true;
    const eventDate = new Date(e.year, e.month - 1, e.day);
    if (tab === "Upcoming") return eventDate.getTime() >= today.getTime();
    if (tab === "Past") return eventDate.getTime() < today.getTime();
    return true;
  });

  return <><Header onMenu={onMenu} title={title} subtitle={subtitle} right={title === "Bookings" ? <Button variant="icon" aria-label="Add booking" onClick={() => onNavigate("add")}><Plus /></Button> : undefined} /><div className="space-y-5 px-4 py-5"><Tabs items={["All", "Upcoming", "Past"]} active={tab} setActive={setTab} />{filteredEvents.length > 0 ? <><p className="text-xs uppercase text-muted-foreground">Events · {filteredEvents.length} found</p><div className="space-y-3">{filteredEvents.map(e => <BookingRow key={e.id} event={e} onClick={() => onEventSelect(e.id)} />)}</div></> : <Empty title="No bookings found" text="There are no bookings matching this filter" />}</div></>;
}

function TasksScreen({ onMenu, onBack, tasks, setTasks, onArchive, selectedEventId, selectedEventDbId, userProfile, addNotification }: { onMenu?: () => void; onBack?: () => void; tasks: Task[]; setTasks: (t: Task[] | ((prev: Task[]) => Task[])) => void; onArchive: () => void; selectedEventId: number | null; selectedEventDbId?: string; userProfile: any; addNotification: (n: NotificationItem) => void }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const activeTasks = useMemo(() => tasks.filter(t => !t.done && t.eventId === selectedEventId), [tasks, selectedEventId]);

  const toggle = async (id: string | number) => {
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return;

    const updatedTasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updatedTasks);
    
    if (taskToUpdate.dbId) {
      await supabase.from('tasks').update({ status: taskToUpdate.done ? 'pending' : 'done' }).eq('id', taskToUpdate.dbId);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const tempId = Date.now().toString();
    const newTask: Task = {
      id: tempId,
      title: newTaskTitle,
      person: userProfile?.name || "Team",
      priority: "Medium",
      due: "Today",
      done: false,
      eventId: selectedEventId || undefined,
    };
    
    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle("");
    setShowAddDialog(false);

    if (selectedEventDbId) {
      const { data } = await supabase.from('tasks').insert({
        booking_id: selectedEventDbId,
        title: newTaskTitle,
        due_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        created_by: (await supabase.auth.getUser()).data.user?.id
      }).select().single();
      
      if (data) {
        setTasks((prev) => prev.map(t => t.id === tempId ? { ...t, id: data.id, dbId: data.id } : t));
      }
    }
    
    if (selectedEventId) {
      addNotification({
        id: Date.now(),
        title: "New Task Added",
        desc: `${userProfile?.name || 'A team member'} added a task for booking #${selectedEventId}`,
        time: "Just now",
        eventId: selectedEventId
      });
    }
  };

  return (
    <>
      <Header
        onMenu={onMenu}
        back={onBack}
        title={selectedEventId ? `Tasks (Booking #${selectedEventId})` : "Tasks"}
        subtitle="Team to-do list"
        right={
          <Button variant="icon" aria-label="Completed task archive" onClick={onArchive}>
            <Trash2 />
          </Button>
        }
      />
      <div className="space-y-3 px-4 py-5 pb-24">
        {activeTasks.length > 0 ? (
          activeTasks.map(t => <TaskRow key={t.id} task={t} toggle={() => toggle(t.id)} />)
        ) : (
          <Empty title="No tasks yet" text="Add your first task to get started" />
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddDialog(true)}
        aria-label="Add task"
        className="group fixed bottom-24 right-6 z-20 flex size-14 items-center justify-center rounded-full border border-electric/40 bg-gradient-to-br from-electric/30 via-card to-rose/30 text-foreground shadow-[0_0_24px_rgba(99,102,241,0.4)] transition-all hover:border-rose/50 hover:shadow-[0_0_32px_rgba(244,63,94,0.5)] active:scale-95"
      >
        <Plus className="size-6 text-foreground transition-transform group-hover:rotate-90" />
      </button>

      {/* Add Task Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAddDialog(false)}>
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="rounded-t-3xl border border-border bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Add New Task</h3>
                <Button variant="icon" aria-label="Close" onClick={() => setShowAddDialog(false)}>
                  <X />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-foreground/90">Task Description</label>
                  <div className="flex min-h-13 items-center gap-2.5 rounded-xl border border-white/10 bg-[#12141c]/90 px-3.5 transition-all focus-within:border-electric/70 focus-within:bg-[#151824]">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTask()}
                      placeholder="Enter task description..."
                      className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted-foreground/40"
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={addTask}
                  disabled={!newTaskTitle.trim()}
                >
                  Add Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CompletedScreen({ tasks, onBack }: { tasks: Task[]; onBack: () => void }) { const done = tasks.filter(t => t.done); return <><Header back={onBack} title="Completed" subtitle="Task archive · Nothing is deleted" /><div className="space-y-3 px-4 py-5">{done.length ? done.map(t => <TaskRow key={t.id} task={t} />) : <Empty title="No completed tasks" text="Finished work will be preserved here." />}</div></>; }

function NotificationsScreen({ onBack, notifications, onNavigateEvent }: { onBack: () => void; notifications: NotificationItem[]; onNavigateEvent: (id: number) => void }) { 
  return <><Header back={onBack} title="Notifications" subtitle="Recent team activity" /><div className="px-4">{notifications.length === 0 ? <Empty title="No notifications" text="You're all caught up!" /> : notifications.map((n, i) => <div key={n.id} className="grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 border-b border-border py-4"><span className="grid size-10 place-items-center rounded-full bg-card"><Bell className="size-4" /></span><div className="min-w-0"><p className="text-sm font-semibold">{n.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{n.desc}</p></div><div className="flex flex-col items-end gap-2"><span className="text-xs text-muted-foreground">{n.time}</span>{n.eventId && <button onClick={() => onNavigateEvent(n.eventId!)} className="text-xs font-semibold text-electric">View Details</button>}</div></div>)}</div></>; 
}

function SettingsScreen({ onMenu, userProfile }: { onMenu?: () => void; userProfile: { name: string; role: string } | null }) { const [dark, setDark] = useState(true); const rows: Array<[LucideIcon, string]> = [[UsersRound, "Team Management"], [Bell, "Notifications"], [HelpCircle, "Help & Support"], [Info, "About BBD"]]; return <><Header onMenu={onMenu} title="More" subtitle="Settings and account" /><div className="px-4 py-5"><div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4"><div className="grid size-12 place-items-center rounded-full bg-secondary font-bold uppercase">{userProfile?.name?.slice(0, 2) || "U"}</div><div className="min-w-0 flex-1"><p className="font-semibold">{userProfile?.name || "User"}</p><p className="text-xs text-muted-foreground capitalize">{userProfile?.role?.replace('_', ' ') || "Team Member"}</p></div><ChevronRight className="size-4 text-muted-foreground" /></div>{rows.map(([Icon, t]) => <button key={t} className="flex min-h-14 w-full items-center gap-3 border-b border-border text-sm"><Icon className="size-4" /><span className="flex-1 text-left">{t}</span><ChevronRight className="size-4 text-muted-foreground" /></button>)}<div className="flex min-h-14 items-center gap-3 border-b border-border text-sm"><Settings className="size-4" /><span className="flex-1">Dark Mode</span><button aria-label="Toggle dark mode" onClick={() => setDark(!dark)} className={cn("flex h-7 w-12 items-center rounded-full p-1", dark ? "justify-end bg-foreground" : "justify-start bg-secondary")}><span className={cn("size-5 rounded-full", dark ? "bg-background" : "bg-muted-foreground")} /></button></div></div></>; }

function RevenueScreen({ onBack }: { onBack: () => void }) {
  const [currentFyData, setCurrentFyData] = useState<{ fy_label: string; total_revenue: number; booking_count: number } | null>(null);
  const [breakdownData, setBreakdownData] = useState<Array<{ id: string; client_name: string; event_type: string; event_date: string; total_budget: number }>>([]);
  const [archiveData, setArchiveData] = useState<Array<{ fy_label: string; total_revenue: number; booking_count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);

        // Fetch current FY revenue
        const { data: currentFy, error: currentFyError } = await supabase.rpc('get_current_fy_revenue');
        if (currentFyError) throw currentFyError;
        if (currentFy && currentFy.length > 0) {
          setCurrentFyData(currentFy[0]);
        }

        // Fetch revenue breakdown for current FY
        const { data: currentFyLabel } = await supabase.rpc('get_current_fy_label');
        if (currentFyLabel) {
          const { data: breakdown, error: breakdownError } = await supabase
            .from('revenue_breakdown')
            .select('id, client_name, event_type, event_date, total_budget')
            .eq('fy_label', currentFyLabel)
            .order('event_date', { ascending: false });

          if (breakdownError) throw breakdownError;
          setBreakdownData(breakdown || []);
        }

        // Fetch all FY summaries for archive (excluding current FY)
        const { data: allFySummary, error: summaryError } = await supabase
          .from('fy_revenue_summary')
          .select('fy_label, total_revenue, booking_count')
          .neq('fy_label', currentFyLabel || '')
          .order('fy_label', { ascending: false });

        if (summaryError) throw summaryError;
        setArchiveData(allFySummary || []);

      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();

    // Subscribe to bookings changes to update revenue in real-time
    const channel = supabase
      .channel('revenue-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchRevenueData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatFyLabel = (fyLabel: string) => {
    const [startYear, endYear] = fyLabel.split('-');
    return `FY ${startYear}–${endYear} · Apr '${endYear} – Mar '${(parseInt(endYear) + 1).toString().slice(-2)}`;
  };

  if (loading) {
    return (
      <>
        <Header back={onBack} title="Total Revenue" subtitle="Indian financial year" right={<Button variant="icon" aria-label="Revenue archive"><Trash2 /></Button>} />
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading revenue data...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header back={onBack} title="Total Revenue" subtitle="Indian financial year" right={<Button variant="icon" aria-label="Revenue archive"><Trash2 /></Button>} />
      <div className="space-y-6 px-4 py-6">
        <section className="border-b border-border pb-8">
          <p className="text-sm text-muted-foreground">
            {currentFyData ? formatFyLabel(currentFyData.fy_label) : 'FY 2026–27 · Apr \'26 – Mar \'27'}
          </p>
          <p className="mt-4 font-mono text-4xl font-semibold">
            {currentFyData ? formatCurrency(currentFyData.total_revenue) : '₹0'}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Across {currentFyData?.booking_count || 0} {currentFyData?.booking_count === 1 ? 'booking' : 'bookings'}
          </p>
        </section>

        {breakdownData.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Revenue breakdown</h2>
            {breakdownData.map(booking => (
              <div key={booking.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-border py-4">
                <div>
                  <p className="text-sm font-medium">{booking.event_type}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(booking.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {booking.client_name}
                  </p>
                </div>
                <p className="font-mono text-sm">{formatCurrency(booking.total_budget)}</p>
              </div>
            ))}
          </div>
        )}

        {archiveData.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Archive</h2>
            <div className="space-y-2">
              {archiveData.map(archive => (
                <button key={archive.fy_label} className="grid min-h-20 w-full grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl border border-border bg-card p-3 text-left">
                  <span className="grid size-10 place-items-center rounded-full bg-secondary">
                    <CircleDollarSign className="size-4" />
                  </span>
                  <span>
                    <b className="block text-sm">{formatFyLabel(archive.fy_label)} · {formatCurrency(archive.total_revenue)}</b>
                    <small className="text-xs text-muted-foreground">{archive.booking_count} bookings preserved</small>
                  </span>
                  <ChevronRight className="size-4" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DrawerContent({ events, currentScreen, onNavigate, userProfile, onSignOut, onClose, members }: { events: EventItem[]; currentScreen: Screen; onNavigate: (s: Screen) => void; userProfile: { name: string; role: string } | null; onSignOut: () => void; onClose?: () => void; members: TeamMember[] }) {
  const allMenuItems: Array<{ key: Screen; label: string; icon: LucideIcon; badge?: string; adminOnly?: boolean }> = [
    { key: "home", label: "Home", icon: Home },
    { key: "team", label: "Team", icon: UsersRound, badge: `${members.length}`, adminOnly: true },
    { key: "bookings", label: "Bookings", icon: CalendarDays, badge: `${events.length}` },
    { key: "tasks", label: "Tasks", icon: ListChecks, badge: `${initialTasks.filter(t => !t.done).length}` },
    { key: "revenue", label: "Total Revenue", icon: CircleDollarSign, adminOnly: true },
    { key: "settings", label: "More & Settings", icon: Settings },
  ];

  const menuItems = allMenuItems.filter(item => !item.adminOnly || userProfile?.role === "admin");

  return (
    <div className="flex min-h-full flex-col justify-between p-5 overflow-y-auto no-scrollbar">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <span className="font-bold text-lg leading-none block">BBD</span>
              <span className="text-[11px] text-muted-foreground">Event Operations</span>
            </div>
          </div>
          {onClose && (
            <Button variant="icon" aria-label="Close menu" onClick={onClose} className="lg:hidden">
              <X className="size-5" />
            </Button>
          )}
        </div>

        <div className="my-5 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/50 p-3">
          <div className="grid size-10 place-items-center rounded-full bg-electric/20 text-electric font-bold text-xs uppercase">
            {userProfile?.name?.slice(0, 2) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{userProfile?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{userProfile?.role?.replace('_', ' ') || "Team Member"}</p>
          </div>
        </div>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Navigation Menu
        </p>

        <nav className="space-y-1.5">
          {menuItems.map(({ key, label, icon: Icon, badge }) => {
            const isActive = currentScreen === key;
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={cn(
                  "group flex min-h-12 w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-electric/15 text-electric border border-electric/30 font-semibold shadow-xs"
                    : "text-foreground/90 hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                <span className={cn("grid size-8 place-items-center rounded-lg transition-colors", isActive ? "bg-electric/20 text-electric" : "bg-secondary text-muted-foreground group-hover:text-foreground")}>
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 text-left">{label}</span>
                {badge && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-mono font-medium", isActive ? "bg-electric/20 text-electric" : "bg-secondary text-muted-foreground")}>
                    {badge}
                  </span>
                )}
                <ChevronRight className={cn("size-4 transition-transform group-hover:translate-x-0.5", isActive ? "text-electric" : "text-muted-foreground/60")} />
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-border/60 space-y-4">
        <Button variant="outline" onClick={onSignOut} className="w-full justify-start text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors">
          <LogOut className="mr-2 size-4" />
          Sign out
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">Plan · Manage · Execute</p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">BBD Mobile App v2.4</p>
        </div>
      </div>
    </div>
  );
}

function Drawer({ events, currentScreen, onClose, onNavigate, userProfile, onSignOut, members }: { events: EventItem[]; currentScreen: Screen; onClose: () => void; onNavigate: (s: Screen) => void; userProfile: { name: string; role: string } | null; onSignOut: () => void; members: TeamMember[] }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200 lg:hidden" onClick={onClose}>
      <aside className="flex h-full w-[82%] max-w-sm flex-col justify-between border-r border-border bg-card/98 backdrop-blur-md shadow-2xl animate-in slide-in-from-left duration-300 overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
        <DrawerContent events={events} currentScreen={currentScreen} onNavigate={onNavigate} userProfile={userProfile} onSignOut={onSignOut} onClose={onClose} members={members} />
      </aside>
    </div>
  );
}

function Tabs({ items, active, setActive }: { items: string[]; active: string; setActive: (s: string) => void }) { return <div className="flex min-w-0 gap-1 overflow-x-auto rounded-lg bg-card p-1 no-scrollbar">{items.map(i => <button key={i} onClick={() => setActive(i)} className={cn("min-h-10 shrink-0 flex-1 rounded-md px-3 text-xs font-medium", active === i ? "bg-foreground text-background" : "text-muted-foreground")}>{i}</button>)}</div>; }
function TaskList({ tasks }: { tasks: Task[] }) { return <div className="space-y-3">{tasks.map(t => <TaskRow key={t.id} task={t} />)}</div>; }
function TaskRow({ task, toggle }: { task: Task; toggle?: () => void }) { const color = task.priority === "High" ? "text-destructive" : task.priority === "Medium" ? "text-chart-4" : "text-chart-3"; return <div className={cn("grid min-h-[82px] grid-cols-[44px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border bg-card p-3", task.done && "opacity-50")}><button aria-label={task.done ? "Mark incomplete" : "Mark complete"} onClick={toggle} disabled={!toggle} className={cn("grid size-8 place-items-center rounded-full border border-border", task.done && "border-chart-2 bg-chart-2 text-background")}>{task.done && <Check className="size-4" />}</button><div className="min-w-0"><div className="flex items-start justify-between gap-2"><p className={cn("text-sm font-medium", task.done && "line-through")}>{task.title}</p><span className={cn("shrink-0 text-xs font-medium", color)}>{task.priority}</span></div><p className="mt-2 text-xs text-muted-foreground">{task.person} · {task.due}</p></div></div>; }
function MemberRow({ member }: { member: TeamMember }) { return <div className="grid min-h-[76px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3"><div className="grid size-11 place-items-center rounded-full bg-secondary text-xs font-bold">{member.initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.name}</p><p className="mt-1 truncate text-xs text-muted-foreground capitalize">{member.role.replace('_', ' ')}</p></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><i className={cn("size-2 rounded-full", member.online ? "bg-chart-2" : "bg-muted-foreground")} />{member.online ? "Online" : "Offline"}</span></div>; }
function AvatarStack({ members = [] }: { members?: TeamMember[] }) { return <div className="mt-5 flex items-center"><div className="flex -space-x-2 flex-wrap">{members.map(m => <span key={m.id} className="grid size-9 place-items-center rounded-full border-2 border-background bg-secondary text-[10px] font-bold">{m.initials}</span>)}</div><span className="ml-3 text-xs text-muted-foreground">{members.length} members assigned</span></div> }
function InfoCard({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-card p-4"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{title}</h2>{action && <button className="min-h-11 text-xs text-muted-foreground">{action}</button>}</div>{children}</section>; }
function FormSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/60 p-5 shadow-lg backdrop-blur-md transition-all hover:border-white/20">
      <div className="pointer-events-none absolute -right-12 -top-12 size-28 rounded-full border border-electric/15 bg-radial from-electric/10 to-transparent" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 size-28 rounded-full border border-rose/15 bg-radial from-rose/10 to-transparent" />
      <legend className="contents">
        <div className="mb-4 flex items-center gap-3">
          {icon && (
            <div className="grid size-10 place-items-center rounded-xl border border-white/15 bg-secondary/70 shadow-xs">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground/80">{subtitle}</p>
          </div>
        </div>
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  icon?: React.ReactNode;
  value?: string;
  onChange?: (s: string) => void;
  prefix?: string;
  textarea?: boolean;
  error?: boolean;
};

function Field({ label, icon, value, onChange, placeholder, prefix, textarea, error, ...props }: FieldProps) {
  if (textarea)
    return (
      <label className="block">
        <span className="mb-2 block text-xs font-medium text-foreground/90">{label}</span>
        <div
          className={cn(
            "flex min-h-24 rounded-xl border bg-[#12141c]/90 px-3.5 transition-all",
            error
              ? "border-destructive shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              : "border-white/10 focus-within:border-electric/70 focus-within:bg-[#151824] focus-within:shadow-[0_0_14px_rgba(99,102,241,0.2)]"
          )}
        >
          <textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="min-h-24 min-w-0 flex-1 resize-none bg-transparent py-3 text-sm text-foreground outline-hidden placeholder:text-muted-foreground/40"
          />
        </div>
        {error && <span className="mt-1 block text-xs text-destructive">This field is required.</span>}
      </label>
    );

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-foreground/90">{label}</span>
      <div
        className={cn(
          "flex min-h-13 items-center gap-2.5 rounded-xl border bg-[#12141c]/90 px-3.5 transition-all",
          error
            ? "border-destructive shadow-[0_0_12px_rgba(239,68,68,0.3)]"
            : "border-white/10 focus-within:border-electric/70 focus-within:bg-[#151824] focus-within:shadow-[0_0_14px_rgba(99,102,241,0.2)]"
        )}
      >
        {icon && <span className="text-muted-foreground/70 [&>svg]:size-4">{icon}</span>}
        {prefix && <span className="text-sm font-medium text-muted-foreground/80">{prefix}</span>}
        <input
          {...props}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted-foreground/40"
        />
      </div>
      {error && <span className="mt-1 block text-xs text-destructive">This field is required.</span>}
    </label>
  );
}

function ActivityPicker({ active, onChange }: { active: string; onChange: (s: string) => void }) {
  const items: Array<[string, LucideIcon]> = [
    ["Singer", Mic2],
    ["Anchor", Mic2],
    ["DJ", Music2],
    ["Photographer", Camera],
    ["Other", Plus],
  ];
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {items.map(([label, Icon]) => (
        <button
          type="button"
          key={label}
          onClick={() => onChange(label)}
          className={cn(
            "flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition-all",
            active === label
              ? "border-electric/80 bg-electric/20 text-foreground shadow-[0_0_12px_rgba(99,102,241,0.35)]"
              : "border-white/10 bg-card/60 text-muted-foreground hover:border-white/20 hover:text-foreground"
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

function SelectField({ label, icon, options, value, onChange }: { label: string; icon?: React.ReactNode; options: string[]; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-foreground/90">{label}</span>
      <div className="flex min-h-13 items-center gap-2.5 rounded-xl border border-white/10 bg-[#12141c]/90 px-3.5 transition-all focus-within:border-electric/70 focus-within:bg-[#151824] focus-within:shadow-[0_0_14px_rgba(99,102,241,0.2)]">
        {icon && <span className="text-muted-foreground/70 [&>svg]:size-4">{icon}</span>}
        <select value={value} onChange={(e) => onChange?.(e.target.value)} className="min-h-11 w-full bg-transparent text-sm text-foreground outline-hidden">
          {options.map((o) => (
            <option key={o} className="bg-card text-foreground">
              {o}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function Detail({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="mb-3 grid grid-cols-[36px_1fr] gap-3 last:mb-0">
      <span className="grid size-9 place-items-center rounded-full bg-secondary [&>svg]:size-4">{icon}</span>
      <span>
        <b className="block text-sm font-medium">{title}</b>
        <small className="text-xs text-muted-foreground">{text}</small>
      </span>
    </div>
  );
}

function Quick({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2">
      <p className="truncate font-mono text-sm font-semibold">{value}</p>
      <p className="mt-1 truncate text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-electric/30 bg-electric/10 px-3.5 text-xs text-foreground shadow-xs transition-all hover:border-electric/50 [&>svg]:size-3.5">
      {children}
    </span>
  );
}
function Empty({ title, text }: { title: string; text: string }) { return <div className="py-20 text-center"><Sparkles className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>; }