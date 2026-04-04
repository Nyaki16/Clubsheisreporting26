"use client";

import { Calendar, DollarSign, Users, TrendingUp, AlertCircle } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  calendar: Calendar,
  dollar: DollarSign,
  users: Users,
  trending: TrendingUp,
  alert: AlertCircle,
};

interface ActivityEvent {
  date: string;
  icon: string;
  title: string;
  description: string;
}

// Activity log will be populated from dashboard_data in future
// For now shows a placeholder
export function ActivityContent({ slug }: { slug: string }) {
  void slug;
  const events: ActivityEvent[] = [];

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-serif text-xl font-semibold text-gray-900">Activity Log</h2>
          <p className="text-sm text-gray-500 mb-4">A chronological record of key events and actions this month.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Calendar className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-400 text-sm">Activity log will be populated after the next data sync.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-gray-900">Activity Log</h2>
        <p className="text-sm text-gray-500 mb-4">A chronological record of key events and actions this month.</p>
      </div>
      <div className="space-y-0">
        {events.map((event, i) => {
          const Icon = iconMap[event.icon] || Calendar;
          return (
            <div key={i} className="flex gap-4 pb-6 relative">
              {i < events.length - 1 && (
                <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gray-200" />
              )}
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 z-10">
                <Icon size={18} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">{event.date}</p>
                <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
