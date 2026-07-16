import { TrendingUp, Flame, Zap, Award } from 'lucide-react';

const stats = [
  { icon: Flame,      label: 'Focus Streak',    value: '5 days',  sub: '+2 from last week',     iconBg: '#FFF0E8', iconColor: '#E07040' },
  { icon: Zap,        label: 'Sessions Today',  value: '3 / 6',   sub: '50% complete',           iconBg: '#F7E7A8', iconColor: '#B8860B' },
  { icon: TrendingUp, label: 'Weekly Score',    value: '84%',     sub: 'Up 6pts vs last week',   iconBg: '#DDF3DF', iconColor: '#4A9459' },
  { icon: Award,      label: 'Tasks Done',      value: '24 / 30', sub: 'On track for goal',      iconBg: '#DCECF8', iconColor: '#4A7FB8' },
];

export function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-start gap-4 px-5 py-5 transition-shadow hover:shadow-md"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 16px 0 rgba(36,48,36,0.07)', borderRadius: 16 }}
        >
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 40, height: 40, background: s.iconBg }}
          >
            <s.icon size={20} style={{ color: s.iconColor }} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium mb-0.5" style={{ color: '#5F6E5F' }}>{s.label}</p>
            <p className="text-xl font-bold leading-none mb-1" style={{ color: '#243024' }}>{s.value}</p>
            <p className="text-xs" style={{ color: '#5F6E5F' }}>{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
