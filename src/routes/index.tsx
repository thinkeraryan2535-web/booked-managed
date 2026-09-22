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

type Screen = "home" | "day" | "empty" | "add" | "event" | "team" | "bookings" | "tasks" | "completed" | "notifications" | "settings" | "revenue";
type Task = { id: number; title: string; person: string; priority: "High" | "Medium" | "Low"; due: string; done: boolean };

type EventItem = { id: number; day: number; title: string; client: string; date: string; time: string; venue: string; budget: number; spent: number; people: number; status: string };

const members = [
  { name: "Aryan Gupta", role: "Event Manager · You", initials: "AG", online: true },
  { name: "Riya Sharma", role: "Production Lead", initials: "RS", online: true },
  { name: "Kabir Singh", role: "Vendor Manager", initials: "KS", online: false },
  { name: "Ananya Roy", role: "Guest Experience", initials: "AR", online: true },
];

const initialTasks: Task[] = [
  { id: 1, title: "Confirm stage production setup", person: "Riya", priority: "High", due: "Today · 4:00 PM", done: false },
  { id: 2, title: "Share final guest list with venue", person: "Aryan", priority: "Medium", due: "Today · 6:00 PM", done: false },
  { id: 3, title: "Lock photographer arrival time", person: "Kabir", priority: "Low", due: "Tomorrow · 10:00 AM", done: false },
  { id: 4, title: "Client menu approval", person: "Ananya", priority: "Medium", due: "Completed yesterday", done: true },
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

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [drawer, setDrawer] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [toast, setToast] = useState("");
  const [selectedDay, setSelectedDay] = useState(24);
  const [events, setEvents] = useState<EventItem[]>([]);

  // Load bookings from Supabase
  useEffect(() => {
    const loadBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_name, event_type, event_date, event_time, venue_text, total_budget, spent_amount, people_count, status")
        .order("event_date", { ascending: true });
      if (error) { console.error("Load bookings error:", error); return; }
      if (data) {
        setEvents(data.map((b, i) => ({
          id: i + 1,
          day: new Date(b.event_date).getDate(),
          title: b.event_type,
          client: b.client_name,
          date: new Date(b.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
          time: b.event_time ? b.event_time.slice(0, 5) : "",
          venue: b.venue_text,
          budget: Number(b.total_budget),
          spent: Number(b.spent_amount),
          people: b.people_count,
          status: b.status,
        })));
      }
    };
    loadBookings();
    // Real-time: reload when bookings change
    const channel = supabase
      .channel("app-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, loadBookings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const navigate = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2200); };

  if (!loggedIn) return <Login otpStep={otpStep} setOtpStep={setOtpStep} onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="min-h-dvh bg-background">
      <main className="relative mx-auto min-h-dvh w-full max-w-[480px] border-x border-border bg-background pb-20">
        {screen === "home" && <HomeScreen events={events} onMenu={() => setDrawer(true)} onNavigate={navigate} setSelectedDay={setSelectedDay} />}
        {screen === "day" && <DayScreen events={events} day={selectedDay} onBack={() => navigate("home")} onNavigate={navigate} />}
        {screen === "empty" && <EmptyDay day={selectedDay} onBack={() => navigate("home")} onAdd={() => navigate("add")} />}
        {screen === "add" && <AddBooking onBack={() => navigate("home")} onSave={() => { notify("Booking saved ✓"); navigate("home"); }} />}
        {screen === "event" && <EventDetails onBack={() => navigate("bookings")} onNavigate={navigate} tasks={tasks} />}
        {screen === "team" && <TeamScreen onMenu={() => setDrawer(true)} notify={notify} />}
        {screen === "bookings" && <BookingsScreen events={events} onMenu={() => setDrawer(true)} onNavigate={navigate} />}
        {screen === "tasks" && <TasksScreen onMenu={() => setDrawer(true)} tasks={tasks} setTasks={setTasks} onArchive={() => navigate("completed")} />}
        {screen === "completed" && <CompletedScreen tasks={tasks} onBack={() => navigate("tasks")} />}
        {screen === "notifications" && <NotificationsScreen onBack={() => navigate("home")} />}
        {screen === "settings" && <SettingsScreen onMenu={() => setDrawer(true)} onSignOut={() => setLoggedIn(false)} />}
        {screen === "revenue" && <RevenueScreen onBack={() => navigate("home")} />}
      </main>
      {drawer && <Drawer currentScreen={screen} onClose={() => setDrawer(false)} onNavigate={(target) => { setDrawer(false); navigate(target); }} />}
      {toast && <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-lg border border-border bg-foreground px-4 py-3 text-sm font-semibold text-background">{toast}</div>}
    </div>
  );
}

function Login({ otpStep, setOtpStep, onLogin }: { otpStep: boolean; setOtpStep: (v: boolean) => void; onLogin: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

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

        {!otpStep ? (
          <div className="mt-9 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium text-foreground/90">
                Phone number
              </label>
              <div className="group relative flex min-h-14 items-center gap-3 rounded-xl border border-white/10 bg-[#12141c]/90 px-4 transition-all focus-within:border-electric/70 focus-within:bg-[#151824]">
                <Phone className="size-4 text-muted-foreground/70 transition-colors group-focus-within:text-electric" />
                <input
                  type="tel"
                  aria-label="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-foreground outline-hidden placeholder:text-muted-foreground/40"
                />
                <span className="size-1.5 rounded-full bg-electric/90 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              </div>
            </div>

            <button
              onClick={() => setOtpStep(true)}
              disabled={phone.length < 6}
              className="relative group flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-r from-secondary/90 via-secondary/70 to-secondary/90 px-4 text-sm font-semibold text-foreground shadow-lg transition-all hover:border-white/25 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                Send OTP <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-9 space-y-5 animate-in fade-in duration-300">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-medium text-foreground/90">
                  6-digit OTP
                </label>
                <button onClick={() => setOtpStep(false)} className="text-xs text-electric hover:underline">
                  Change number
                </button>
              </div>
              <div className="group relative flex min-h-14 items-center justify-center rounded-xl border border-white/10 bg-[#12141c]/90 px-4 transition-all focus-within:border-electric/70 focus-within:bg-[#151824]">
                <input
                  aria-label="OTP code"
                  maxLength={6}
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  className="h-full w-full bg-transparent text-center font-mono text-xl tracking-[0.5em] text-foreground outline-hidden placeholder:text-muted-foreground/30"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground/70">
                Enter code sent to <span className="font-mono text-foreground/90">{phone || "+91 98765 43210"}</span>
              </p>
            </div>

            <button
              disabled={code.length < 4}
              onClick={onLogin}
              className="relative group flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-gradient-to-r from-secondary/90 via-secondary/70 to-secondary/90 px-4 text-sm font-semibold text-foreground shadow-lg transition-all hover:border-white/25 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                Verify & Continue <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>

            <button className="min-h-11 w-full text-xs text-muted-foreground/70 transition-colors hover:text-foreground">
              Resend OTP in <span className="font-mono text-electric">00:24</span>
            </button>
          </div>
        )}
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
    {back ? <Button variant="icon" aria-label="Go back" onClick={back}><ArrowLeft /></Button> : onMenu ? <Button variant="icon" aria-label="Open menu" onClick={onMenu}><Menu /></Button> : <div className="w-10" />}
    <div className="min-w-0"><h1 className="truncate text-xl font-bold">{title}</h1>{subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}</div><div>{right}</div>
  </header>;
}

function HomeScreen({ events, onMenu, onNavigate, setSelectedDay }: { events: EventItem[]; onMenu: () => void; onNavigate: (s: Screen) => void; setSelectedDay: (d: number) => void }) {
  const marked = new Set(events.map(e => e.day)); const firstOffset = 2;
  return <><header className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4"><Button variant="icon" aria-label="Open menu" onClick={onMenu}><Menu /></Button><div className="min-w-0"><p className="text-xs text-muted-foreground">Good morning</p><h1 className="truncate text-lg font-bold">Team BBD</h1></div><div className="flex"><Button variant="icon" aria-label="Notifications" onClick={() => onNavigate("notifications")} className="relative"><Bell /><span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" /></Button><div className="grid size-10 place-items-center self-center rounded-full bg-secondary text-xs font-bold">AG</div></div></header>
    <div className="space-y-8 px-4"><section className="premium-surface relative overflow-hidden rounded-2xl border p-5"><div className="absolute -right-10 -top-12 size-36 rounded-full border border-electric/20" /><div className="absolute -bottom-16 -left-12 size-36 rounded-full border border-rose/15" /><div className="relative mb-5 flex items-center justify-between"><div><p className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4 text-electric" />Team calendar</p><h2 className="mt-2 text-xl font-semibold">September 2026</h2></div><div className="flex gap-1"><Button variant="icon" aria-label="Previous month" className="border border-border bg-secondary/60"><ChevronLeft /></Button><Button variant="icon" aria-label="Next month" className="border border-border bg-secondary/60"><ChevronRight /></Button></div></div><div className="relative grid grid-cols-7 text-center">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={`${d}${i}`} className="pb-3 text-xs text-muted-foreground">{d}</span>)}{Array.from({ length: firstOffset }).map((_, i) => <span key={`x${i}`} />)}{Array.from({ length: 30 }, (_, i) => i + 1).map(day => <button key={day} onClick={() => { setSelectedDay(day); onNavigate(marked.has(day) ? "day" : "empty"); }} className="relative flex min-h-12 flex-col items-center justify-center rounded-lg text-sm"><span className={cn("grid size-8 place-items-center rounded-full", day === 21 && "active-glow font-semibold text-foreground")}>{day}</span>{marked.has(day) && <Heart className="absolute bottom-0 size-2.5 fill-destructive text-destructive" />}</button>)}</div></section>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-5 text-electric" />Upcoming events</h2><button onClick={() => onNavigate("bookings")} className="min-h-11 text-sm text-muted-foreground">View all ›</button></div>{events.length > 0 ? <div className="space-y-3">{events.slice(0, 3).map(e => <BookingRow key={e.id} event={e} onClick={() => onNavigate("event")} />)}</div> : <Empty title="No bookings yet" text="Add your first booking to get started" />}</section></div></>;
}

function BookingRow({ event, onClick }: { event: EventItem; onClick: () => void }) { return <button onClick={onClick} className="event-surface grid min-h-[96px] w-full grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border p-4 text-left"><div className="grid h-16 place-items-center rounded-xl border border-electric/30 bg-electric/10"><span className="font-mono text-xl font-semibold">{event.day}</span><span className="-mt-3 text-[10px] text-muted-foreground">SEP</span></div><div className="min-w-0"><p className="truncate font-semibold">{event.title} <span className="inline-block size-1.5 rounded-full bg-destructive" /></p><p className="mt-1 truncate text-xs text-muted-foreground">{event.client}</p><p className="mt-1 truncate text-xs text-muted-foreground">{event.time} · {event.venue}</p></div><ChevronRight className="size-5 text-muted-foreground" /></button>; }

function DayScreen({ events, day, onBack, onNavigate }: { events: EventItem[]; day: number; onBack: () => void; onNavigate: (s: Screen) => void }) {
  const e = events.find(x => x.day === day);
  if (!e) {
    return <EmptyDay day={day} onBack={onBack} onAdd={() => onNavigate("add")} />;
  }
  const pct = Math.round(e.spent / e.budget * 100);
  return <><Header back={onBack} title={`${e.date}`} subtitle="Team Calendar" right={<Button variant="ghost" className="px-2">Day <ChevronDown /></Button>} /><div className="space-y-4 px-4 py-5">
    <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5"><div className="absolute inset-x-0 top-0 h-1 bg-foreground" /><span className="text-xs font-semibold text-muted-foreground">BOOKING</span><h2 className="mt-8 text-2xl font-bold">{e.title} <span className="inline-block size-2 rounded-full bg-destructive" /></h2><p className="mt-2 text-sm text-muted-foreground">For {e.client}</p><div className="mt-5 flex items-center gap-2 text-sm"><Clock3 className="size-4" />{e.time}</div><Button className="mt-6 w-full" onClick={() => onNavigate("event")}>View Full Details <ChevronRight /></Button></section>
    <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card py-4 text-center"><Quick label="Thursday" value={e.date.split(" ")[0] ?? e.date} /><Quick label="Location" value="Delhi" /><Quick label="Guests" value={`${e.people}`} /></div>
    <InfoCard title="Client Details" action="Edit"><Detail icon={<UserRound />} title={e.client} text="Primary client" /><Detail icon={<Phone />} title="+91 98765 43210" text="Phone" /><Detail icon={<Mail />} title="aarav@northstar.in" text="Email" /><blockquote className="mt-4 border-l border-foreground pl-3 text-sm text-muted-foreground">"Keep the launch clean, premium and energetic."</blockquote></InfoCard>
    <InfoCard title="Venue Details"><Detail icon={<Building2 />} title="The Grand Hotel" text="Connaught Place, New Delhi" /><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><Quick label="Hall" value="Regency" /><Quick label="Cost" value="₹2.4L" /><Quick label="Capacity" value="300" /></div></InfoCard>
    <InfoCard title="Budget"><p className="font-mono text-2xl font-semibold">₹{(e.budget / 100000).toFixed(1)}L</p><div className="my-4 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-foreground" style={{ width: `${pct}%` }} /></div><div className="grid grid-cols-2"><Quick label="Spent" value={`₹${(e.spent / 100000).toFixed(2)}L`} /><Quick label="Remaining" value={`₹${((e.budget - e.spent) / 100000).toFixed(2)}L`} /></div></InfoCard>
    <InfoCard title="Special Demands" action="Edit"><div className="flex gap-2 overflow-x-auto no-scrollbar"><Chip>Vegan menu</Chip><Chip>LED stage</Chip><Chip>VIP lounge</Chip></div></InfoCard>
    <InfoCard title="Extra Activity" action="Edit"><div className="flex gap-2"><Chip><Music2 /> DJ</Chip><Chip><Camera /> Photographer</Chip></div></InfoCard>
    <Button className="sticky bottom-4 w-full" onClick={() => onNavigate("tasks")}>Manage Tasks <ChevronRight /></Button>
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

function AddBooking({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
  const [activity, setActivity] = useState("DJ");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [venue, setVenue] = useState("");
  const [eventType, setEventType] = useState("Corporate Retreat");
  const [eventDate, setEventDate] = useState("2026-09-24");
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
    if (!name.trim() || phone.length < 7 || !venue.trim() || !people || !hallName.trim()) {
      setError(true);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError(true); setSaving(false); return; }
      const fyLabel = computeFyLabel(eventDate);
      const { error: insertError } = await supabase.from("bookings").insert({
        client_name: name.trim(),
        phone: phone.trim(),
        event_type: eventType,
        event_date: eventDate,
        fy_label: fyLabel,
        venue_text: venue.trim(),
        advance_payment: Number(advPayment) || 0,
        total_budget: Number(totalBudget) || 0,
        hall_name: hallName.trim(),
        hall_cost: Number(hallCost) || 0,
        people_count: Number(people) || 1,
        special_demand: specialDemand.trim() || null,
        extra_activities: activity ? [activity] : [],
        status: "upcoming",
        created_by: user.id,
      });
      if (insertError) {
        console.error("Insert error:", insertError);
        setError(true);
        setSaving(false);
        notify("Error saving booking. Please try again.");
        return;
      }
      onSave();
    } catch (err) {
      console.error("Save booking error:", err);
      setError(true);
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
          <Field label="Contact Person" icon={<UserRound />} placeholder="Optional" />
          <Field
            label="Phone Number *"
            icon={<Phone />}
            value={phone}
            onChange={setPhone}
            placeholder="98765 43210"
            prefix="+91"
            error={error && phone.length < 7}
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
          <Field label="Date *" icon={<CalendarDays />} type="date" defaultValue="2026-09-24" />
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
            <Field label="Advance Payment" prefix="₹" inputMode="numeric" placeholder="0" />
            <Field label="Total Budget *" prefix="₹" inputMode="numeric" placeholder="0" />
          </div>
        </FormSection>

        <FormSection
          icon={<Building2 className="size-5 text-electric" />}
          title="Hall Details"
          subtitle="Venue capacity and cost"
        >
          <Field label="Place / Hall Name *" placeholder="Regency Hall" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost *" prefix="₹" />
            <Field label="No. of People *" inputMode="numeric" />
          </div>
        </FormSection>

        <FormSection
          icon={<Sparkles className="size-5 text-rose" />}
          title="Special Demand"
          subtitle="Specific client requirements"
        >
          <Field label="Requirements" textarea placeholder="Menu, stage, accessibility…" />
        </FormSection>

        <FormSection
          icon={<Music2 className="size-5 text-electric" />}
          title="Extra Activity"
          subtitle="Entertainment and add-ons"
        >
          <ActivityPicker active={activity} onChange={setActivity} />
          <Field label="Activity details" placeholder="Name, time, genre, etc." />
        </FormSection>
      </form>

      {/* Floating Glowing Dual Gradient Create Booking CTA */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-white/10 bg-[#07080c]/90 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={save}
          className="relative group flex min-h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border border-electric/40 bg-gradient-to-r from-electric/25 via-[#121420] to-rose/25 px-6 text-sm font-semibold text-foreground shadow-[0_0_24px_rgba(99,102,241,0.25)] transition-all hover:border-rose/50 hover:shadow-[0_0_32px_rgba(244,63,94,0.35)] active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-electric/20 text-electric font-bold text-xs">
              +
            </span>
            Create Booking
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );
}

function EventDetails({ onBack, onNavigate, tasks }: { onBack: () => void; onNavigate: (s: Screen) => void; tasks: Task[] }) {
  const [tab, setTab] = useState("Overview");
  const e = events[0];

  if (!e) {
    return <><Header back={onBack} title="Event Details" subtitle="BBD" /><div className="px-4 py-5"><Empty title="No event found" text="This event no longer exists" /></div></>;
  }

  return <><Header back={onBack} title="Event Details" subtitle="BBD · Booking #2409" /><div className="px-4 py-5"><div><span className="text-xs text-muted-foreground">PRODUCT LAUNCH</span><h2 className="mt-2 text-2xl font-bold">{e.title} <span className="inline-block size-2 rounded-full bg-destructive" /></h2><p className="mt-2 text-sm text-muted-foreground">{e.client} · {e.date} · {e.time}</p><p className="mt-1 text-sm text-muted-foreground">{e.venue}</p><AvatarStack /></div><Tabs items={["Overview", "Tasks", "Team"]} active={tab} setActive={setTab} />{tab === "Overview" && <div className="space-y-4"><InfoCard title="Client"><Detail icon={<UserRound />} title={e.client} text="+91 98765 43210" /></InfoCard><InfoCard title="Event Summary"><Detail icon={<CalendarDays />} title={e.date} text={`${e.time} · ${e.people} guests`} /><Detail icon={<MapPin />} title="The Grand Hotel" text="Connaught Place, New Delhi" /></InfoCard><Button className="w-full" onClick={() => onNavigate("day")}>View All Details <ChevronRight /></Button></div>}{tab === "Tasks" && <TaskList tasks={tasks} />}{tab === "Team" && <div className="space-y-3">{members.slice(0, 3).map(m => <MemberRow key={m.name} member={m} />)}</div>}</div></>;
}

function TeamScreen({ onMenu, notify }: { onMenu?: () => void; notify: (s: string) => void }) { const [filter, setFilter] = useState("All"); const [query, setQuery] = useState(""); const shown = members.filter(m => (filter === "All" || (filter === "Online" ? m.online : !m.online)) && m.name.toLowerCase().includes(query.toLowerCase())); return <><Header onMenu={onMenu} title="Team" subtitle={`${members.length} members`} right={<Button variant="icon" aria-label="Add team member" onClick={() => notify("Invite link ready to share")}><Plus /></Button>} /><div className="space-y-5 px-4 py-5"><div className="flex min-h-12 items-center gap-3 rounded-lg bg-secondary px-3"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search team" className="min-w-0 flex-1 bg-transparent text-sm outline-hidden" /></div><Tabs items={["All", "Online", "Offline"]} active={filter} setActive={setFilter} /><div className="space-y-3">{shown.length ? shown.map(m => <MemberRow key={m.name} member={m} />) : <Empty title="No team members found" text="Try another search or filter." />}</div></div></>; }

function BookingsScreen({ onMenu, onNavigate }: { onMenu?: () => void; onNavigate: (s: Screen) => void }) {
  const [tab, setTab] = useState("All");
  return <><Header onMenu={onMenu} title="Bookings" subtitle="All team events" right={<Button variant="icon" aria-label="Add booking" onClick={() => onNavigate("add")}><Plus /></Button>} /><div className="space-y-5 px-4 py-5"><Tabs items={["All", "Upcoming", "Past"]} active={tab} setActive={setTab} />{events.length > 0 ? <><p className="text-xs uppercase text-muted-foreground">September · {events.length} events</p><div className="space-y-3">{events.map(e => <BookingRow key={e.id} event={e} onClick={() => onNavigate("event")} />)}</div></> : <Empty title="No bookings yet" text="Add your first booking to get started" />}</div></>;
}

function TasksScreen({ onMenu, tasks, setTasks, onArchive }: { onMenu?: () => void; tasks: Task[]; setTasks: (t: Task[]) => void; onArchive: () => void }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const activeTasks = useMemo(() => tasks.filter(t => !t.done), [tasks]);

  const toggle = (id: number) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updatedTasks);
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now(),
      title: newTaskTitle,
      person: "Team",
      priority: "Medium",
      due: "Today",
      done: false
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
    setShowAddDialog(false);
  };

  return (
    <>
      <Header
        onMenu={onMenu}
        title="Tasks"
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

function NotificationsScreen({ onBack }: { onBack: () => void }) { const rows = [["New booking assigned", "Product Launch Night was added to your schedule", "2m"], ["Task reminder", "Confirm stage production setup is due at 4:00 PM", "1h"], ["Client message", "“Please add a vegan menu option.”", "3h"], ["Team update", "Riya completed venue inspection", "Yesterday"], ["Event completed", "Brand Summit has been archived", "2d"]]; return <><Header back={onBack} title="Notifications" subtitle="Recent team activity" /><div className="px-4">{rows.map(([t, d, time], i) => <div key={t} className="grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 border-b border-border py-4"><span className="grid size-10 place-items-center rounded-full bg-card">{i === 4 ? <Check className="size-4 text-chart-2" /> : <Bell className="size-4" />}</span><div className="min-w-0"><p className="text-sm font-semibold">{t}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{d}</p></div><span className="text-xs text-muted-foreground">{time}</span></div>)}</div></>; }

function SettingsScreen({ onMenu, onSignOut }: { onMenu?: () => void; onSignOut: () => void }) { const [dark, setDark] = useState(true); const rows: Array<[LucideIcon, string]> = [[UsersRound, "Team Management"], [Bell, "Notifications"], [HelpCircle, "Help & Support"], [Info, "About BBD"]]; return <><Header onMenu={onMenu} title="More" subtitle="Settings and account" /><div className="px-4 py-5"><div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4"><div className="grid size-12 place-items-center rounded-full bg-secondary font-bold">AG</div><div className="min-w-0 flex-1"><p className="font-semibold">Aryan Gupta</p><p className="text-xs text-muted-foreground">Event Manager · Admin</p></div><ChevronRight className="size-4 text-muted-foreground" /></div>{rows.map(([Icon, t]) => <button key={t} className="flex min-h-14 w-full items-center gap-3 border-b border-border text-sm"><Icon className="size-4" /><span className="flex-1 text-left">{t}</span><ChevronRight className="size-4 text-muted-foreground" /></button>)}<div className="flex min-h-14 items-center gap-3 border-b border-border text-sm"><Settings className="size-4" /><span className="flex-1">Dark Mode</span><button aria-label="Toggle dark mode" onClick={() => setDark(!dark)} className={cn("flex h-7 w-12 items-center rounded-full p-1", dark ? "justify-end bg-foreground" : "justify-start bg-secondary")}><span className={cn("size-5 rounded-full", dark ? "bg-background" : "bg-muted-foreground")} /></button></div><Button variant="outline" onClick={onSignOut} className="mt-8 w-full"><LogOut />Sign out</Button></div></>; }

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

function Drawer({ currentScreen, onClose, onNavigate }: { currentScreen: Screen; onClose: () => void; onNavigate: (s: Screen) => void }) {
  const menuItems: Array<{ key: Screen; label: string; icon: LucideIcon; badge?: string }> = [
    { key: "home", label: "Home", icon: Home },
    { key: "team", label: "Team", icon: UsersRound, badge: `${members.length}` },
    { key: "bookings", label: "Bookings", icon: CalendarDays, badge: `${events.length}` },
    { key: "tasks", label: "Tasks", icon: ListChecks, badge: `${initialTasks.filter(t => !t.done).length}` },
    { key: "revenue", label: "Total Revenue", icon: CircleDollarSign },
    { key: "settings", label: "More & Settings", icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <aside className="flex h-full w-[82%] max-w-sm flex-col justify-between border-r border-border bg-card/98 p-5 backdrop-blur-md shadow-2xl animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <span className="font-bold text-lg leading-none block">BBD</span>
                <span className="text-[11px] text-muted-foreground">Event Operations</span>
              </div>
            </div>
            <Button variant="icon" aria-label="Close menu" onClick={onClose}>
              <X className="size-5" />
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/50 p-3">
            <div className="grid size-10 place-items-center rounded-full bg-electric/20 text-electric font-bold text-xs">
              AG
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">Aryan Gupta</p>
              <p className="text-xs text-muted-foreground truncate">Event Manager</p>
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

        <div className="pt-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground">Plan · Manage · Execute</p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">BBD Mobile App v2.4</p>
        </div>
      </aside>
    </div>
  );
}

function Tabs({ items, active, setActive }: { items: string[]; active: string; setActive: (s: string) => void }) { return <div className="flex min-w-0 gap-1 overflow-x-auto rounded-lg bg-card p-1 no-scrollbar">{items.map(i => <button key={i} onClick={() => setActive(i)} className={cn("min-h-10 shrink-0 flex-1 rounded-md px-3 text-xs font-medium", active === i ? "bg-foreground text-background" : "text-muted-foreground")}>{i}</button>)}</div>; }
function TaskList({ tasks }: { tasks: Task[] }) { return <div className="space-y-3">{tasks.slice(0, 3).map(t => <TaskRow key={t.id} task={t} />)}</div>; }
function TaskRow({ task, toggle }: { task: Task; toggle?: () => void }) { const color = task.priority === "High" ? "text-destructive" : task.priority === "Medium" ? "text-chart-4" : "text-chart-3"; return <div className={cn("grid min-h-[82px] grid-cols-[44px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border bg-card p-3", task.done && "opacity-50")}><button aria-label={task.done ? "Mark incomplete" : "Mark complete"} onClick={toggle} disabled={!toggle} className={cn("grid size-8 place-items-center rounded-full border border-border", task.done && "border-chart-2 bg-chart-2 text-background")}>{task.done && <Check className="size-4" />}</button><div className="min-w-0"><div className="flex items-start justify-between gap-2"><p className={cn("text-sm font-medium", task.done && "line-through")}>{task.title}</p><span className={cn("shrink-0 text-xs font-medium", color)}>{task.priority}</span></div><p className="mt-2 text-xs text-muted-foreground">{task.person} · {task.due}</p></div></div>; }
function MemberRow({ member }: { member: typeof members[number] }) { return <div className="grid min-h-[76px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3"><div className="grid size-11 place-items-center rounded-full bg-secondary text-xs font-bold">{member.initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{member.role}</p></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><i className={cn("size-2 rounded-full", member.online ? "bg-chart-2" : "bg-muted-foreground")} />{member.online ? "Online" : "Offline"}</span></div>; }
function AvatarStack() { return <div className="mt-5 flex items-center"><div className="flex -space-x-2">{members.slice(0, 3).map(m => <span key={m.initials} className="grid size-9 place-items-center rounded-full border-2 border-background bg-secondary text-[10px] font-bold">{m.initials}</span>)}</div><span className="ml-3 text-xs text-muted-foreground">3 members assigned</span></div> }
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

function SelectField({ label, icon, options }: { label: string; icon?: React.ReactNode; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-foreground/90">{label}</span>
      <div className="flex min-h-13 items-center gap-2.5 rounded-xl border border-white/10 bg-[#12141c]/90 px-3.5 transition-all focus-within:border-electric/70 focus-within:bg-[#151824] focus-within:shadow-[0_0_14px_rgba(99,102,241,0.2)]">
        {icon && <span className="text-muted-foreground/70 [&>svg]:size-4">{icon}</span>}
        <select className="min-h-11 w-full bg-transparent text-sm text-foreground outline-hidden">
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