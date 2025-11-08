import React, { useEffect, useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./JobsCalendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

export default function JobsCalendar({ token }) {
  const [jobs, setJobs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch("http://localhost:4000/api/jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err) {
        console.error("❌ Failed to load jobs for calendar:", err);
      }
    }
    loadJobs();
  }, [token]);

  // 🗓️ Convert jobs → calendar events
  const events = useMemo(() => {
    return jobs
      .filter((j) => j.deadline)
      .map((j) => ({
        id: j.id,
        title: `${j.title} — ${j.company}`,
        start: new Date(j.deadline),
        end: new Date(j.deadline),
        allDay: true,
        color: getEventColor(j),
      }));
  }, [jobs]);

  function getEventColor(job) {
    const daysLeft = Math.ceil(
      (new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft < 0) return "#ef4444";   // red
    if (daysLeft <= 3) return "#facc15";  // yellow
    return "#4ade80";                     // green
  }

  return (
    <div className="calendar-container">
      <button className="calendar-toggle" onClick={() => setOpen(!open)}>
        📅 {open ? "Hide Calendar" : "View Calendar"}
      </button>

      {open && (
        <div className="big-calendar-wrapper fade-in">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            views={["month"]}
            defaultView="month"
            toolbar={true}
            popup
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: event.color,
                borderRadius: "6px",
                color: "#1e293b",
                fontWeight: 500,
              },
            })}
          />
        </div>
      )}
    </div>
  );
}
