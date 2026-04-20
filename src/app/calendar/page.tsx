"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ja } from "date-fns/locale/ja";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarDays, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { FrontendEvent } from "@/app/api/events/route";

const locales = {
  ja: ja,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CustomToolbar = (toolbar: any) => {
  const goToBack = () => toolbar.onNavigate("PREV");
  const goToNext = () => toolbar.onNavigate("NEXT");
  const goToCurrent = () => toolbar.onNavigate("TODAY");
  const label = () => {
    const date = format(toolbar.date, "yyyy年 M月", { locale: ja });
    return <span className="font-bold text-lg text-slate-800">{date}</span>;
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex space-x-2">
        <Button variant="secondary" size="sm" onClick={goToBack}>前へ</Button>
        <Button variant="secondary" size="sm" onClick={goToCurrent}>今日</Button>
        <Button variant="secondary" size="sm" onClick={goToNext}>次へ</Button>
      </div>
      <div>{label()}</div>
      <div className="flex space-x-2">
        {['month', 'week', 'day'].map((viewName) => (
          <Button
            key={viewName}
            variant={toolbar.view === viewName ? "primary" : "secondary"}
            size="sm"
            onClick={() => toolbar.onView(viewName as View)}
          >
            {viewName === 'month' ? '月' : viewName === 'week' ? '週' : '日'}
          </Button>
        ))}
      </div>
    </div>
  );
};


export default function CalendarPage() {
  const [events, setEvents] = useState<FrontendEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(new Set());

  const fetchEvents = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      // 描画中の月の前後1ヶ月を取得する
      const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 2, 0);

      const res = await fetch(`/api/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data: FrontendEvent[] = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate, fetchEvents]);

  const toggleCalendar = (calName: string) => {
    setHiddenCalendars(prev => {
      const next = new Set(prev);
      if (next.has(calName)) next.delete(calName);
      else next.add(calName);
      return next;
    });
  };

  const activeEvents = events.filter(ev => !hiddenCalendars.has(ev.calendarName ?? "Unknown"));

  const mappedEvents = activeEvents.map(ev => ({
    title: ev.title,
    start: new Date(ev.start),
    end: new Date(ev.end),
    allDay: ev.isAllDay,
    provider: ev.provider,
  }));

  const uniqueCalendars = Array.from(new Set(events.map(e => e.calendarName ?? "Unknown"))).sort();

  const eventPropGetter = (event: any) => {
    let backgroundColor = "#3b82f6"; // Google (Blue)
    if (event.provider === "timetree") {
      backgroundColor = "#10b981"; // TimeTree (Emerald)
    }
    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        opacity: 0.95,
        color: "white",
        border: "0px",
        display: "block",
        fontSize: "12px",
        fontWeight: "bold",
        padding: "2px 6px"
      }
    };
  };

  return (
    <div className="animate-in w-full h-full p-10 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-start justify-between pb-6 border-b-2 border-slate-200/60 gap-4">
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
              <CalendarDays size={20} />
            </div>
            カレンダープレビュー
          </h1>
          <p className="mt-2 mb-4 text-sm font-bold text-slate-500">
            TimeTree と Google Calendar の予定を一覧表示します
          </p>

          {/* 移動させたチェックボックス */}
          <div className="flex items-center gap-3 text-sm font-bold bg-slate-50/70 px-4 py-2.5 rounded-xl border border-slate-200/60 overflow-x-auto w-full scrollbar-hide">
            <span className="text-slate-400 text-[11px] whitespace-nowrap mr-2">表示切替:</span>
            {uniqueCalendars.map(calName => {
              const isHidden = hiddenCalendars.has(calName);
              const firstEv = events.find(e => e.calendarName === calName);
              const isTT = firstEv?.provider === "timetree";
              return (
                <label key={calName} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                  <input 
                    type="checkbox" 
                    checked={!isHidden} 
                    onChange={() => toggleCalendar(calName)} 
                    className="w-3.5 h-3.5 rounded-sm accent-slate-800"
                  />
                  <span className={isTT ? "text-emerald-700" : "text-blue-700"}>
                    {calName}
                  </span>
                </label>
              );
            })}
            {uniqueCalendars.length === 0 && <span className="text-slate-400 px-2">カレンダーがありません</span>}
          </div>
        </div>

        <div className="flex-shrink-0 mt-2 md:mt-0">
          <Button
            size="lg"
            variant="secondary"
            onClick={() => fetchEvents(currentDate)}
            disabled={loading}
            icon={<RefreshCcw size={16} className={loading ? "animate-spin" : ""} />}
          >
            更新
          </Button>
        </div>
      </header>

      <Card variant="glassPadded" className="p-4 bg-white/70 overflow-hidden">
        {/* CSS override for Big Calendar to look modern */}
        <style dangerouslySetInnerHTML={{__html: `
          .rbc-month-view { border-radius: 12px; overflow: hidden; border-color: #e2e8f0; border-width: 2px; }
          .rbc-header { padding: 12px 0; font-weight: 800; color: #475569; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
          .rbc-day-bg + .rbc-day-bg { border-left: 2px solid #e2e8f0; }
          .rbc-month-row + .rbc-month-row { border-top: 2px solid #e2e8f0; }
          .rbc-date-cell { font-weight: 700; padding: 4px 8px; color: #64748b; }
          .rbc-off-range-bg { background: #f8fafc; }
          .rbc-today { background: #bfdbfe; font-weight: 900; }
          .rbc-event { padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        `}} />
        <div className="h-[700px]">
          <Calendar
            localizer={localizer}
            events={mappedEvents}
            startAccessor="start"
            endAccessor="end"
            eventPropGetter={eventPropGetter}
            culture="ja"
            date={currentDate}
            onNavigate={(newDate) => setCurrentDate(newDate)}
            view={view}
            onView={(newView) => setView(newView)}
            components={{
              toolbar: CustomToolbar
            }}
            formats={{
               dayFormat: (date, culture, localizer) =>
                 localizer!.format(date, "E", culture),
               dayHeaderFormat: (date, culture, localizer) =>
                 localizer!.format(date, "M月d日 E", culture),
               monthHeaderFormat: (date, culture, localizer) =>
                 localizer!.format(date, "yyyy年 M月", culture),
            }}
          />
        </div>
      </Card>
    </div>
  );
}
