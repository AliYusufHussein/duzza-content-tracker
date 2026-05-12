import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Workflow, Calendar, Radio, Sun, LogOut, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useTable } from '@/hooks/useTable';
import { format } from 'date-fns';

const nav = [
  { to: '/', label: 'Today', icon: Sun, end: true, key: 'today' as const },
  { to: '/inbox', label: 'Inbox', icon: Mail, end: false, key: 'inbox' as const },
  { to: '/pipeline', label: 'Pipeline', icon: Workflow, key: 'pipeline' as const },
  { to: '/calendar', label: 'Calendar', icon: Calendar, key: 'calendar' as const },
  { to: '/channels', label: 'Channels', icon: Radio, key: 'channels' as const },
];

export default function AppLayout() {
  const loc = useLocation();
  const { user, signOut } = useAuth();
  const current = nav.find(n => n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to));
  const { rows: calendar } = useTable<any>('calendar', 'date', true);
  const { rows: pipeline } = useTable<any>('pipeline', 'date', false);
  const { rows: inbox } = useTable<any>('inbox', 'created_at', false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const counts: Record<string, number> = {
    today: calendar.filter(c => c.date === today && c.status !== 'Posted').length,
    inbox: inbox.filter(i => i.status === 'pending').length,
    pipeline: pipeline.length,
    calendar: calendar.filter(c => c.status === 'Scheduled').length,
    channels: 0,
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary shadow-elegant flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Content OS</div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">v3 · automated</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, end, key }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}>
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {counts[key] > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground min-w-[20px] text-center">
                  {counts[key]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="text-[11px] text-muted-foreground leading-relaxed truncate" title={user?.email ?? ''}>
            {user?.email}
          </div>
          <Button onClick={signOut} variant="outline" size="sm" className="w-full h-7 text-xs">
            <LogOut className="h-3 w-3 mr-1.5" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">C</span>
              </div>
              <span className="font-semibold text-sm">{current?.label ?? 'Content OS'}</span>
            </div>
          </div>
          <div className="overflow-x-auto no-scrollbar border-t border-border">
            <div className="flex gap-1 px-2 py-2">
              {nav.map(({ to, label, icon: Icon, end, key }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap',
                    isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  )}>
                  <Icon className="h-3.5 w-3.5" />{label}
                  {counts[key] > 0 && (
                    <span className="text-[9px] font-mono px-1 rounded bg-secondary/80">{counts[key]}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
