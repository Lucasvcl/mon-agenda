import { useState, useEffect, useRef } from "react";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const DAYS_SHORT = ["LUN", "MAR", "MER", "JEU", "VEN"];
const HOURS = [
  "08:15",
  "09:15",
  "10:30",
  "11:30",
  "12:30",
  "13:30",
  "14:30",
  "15:45",
  "16:45",
  "17:45",
];

const COLORS = [
  { bg: "#3B82F6", light: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
  { bg: "#8B5CF6", light: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6" },
  { bg: "#EC4899", light: "#FDF2F8", border: "#FBCFE8", text: "#9D174D" },
  { bg: "#10B981", light: "#ECFDF5", border: "#A7F3D0", text: "#065F46" },
  { bg: "#F59E0B", light: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
  { bg: "#EF4444", light: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
  { bg: "#06B6D4", light: "#ECFEFF", border: "#A5F3FC", text: "#155E75" },
  { bg: "#84CC16", light: "#F7FEE7", border: "#D9F99D", text: "#3F6212" },
];

function getWeekId(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekDates(weekId) {
  const [year, week] = weekId.split("-W").map(Number);
  const jan4 = new Date(year, 0, 4);
  const startOfWeek = new Date(
    jan4.getTime() + ((week - 1) * 7 - ((jan4.getDay() + 6) % 7)) * 86400000,
  );
  return DAYS.map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

function formatDate(date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const STORAGE_KEY = "agenda-cours-v1";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { courses: [], completions: {} };
  } catch {
    return { courses: [], completions: {} };
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// Modal component
function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(() => loadData());
  const [currentWeek, setCurrentWeek] = useState(() => getWeekId(new Date()));
  const [modal, setModal] = useState(null); // null | { type: 'add', dayIdx, hour } | { type: 'edit', course }
  const [form, setForm] = useState({
    name: "",
    colorIdx: 0,
    dayIdx: 0,
    startHour: "08:00",
    endHour: "09:00",
    recurring: true,
  });
  const [activeTab, setActiveTab] = useState("week"); // 'week' | 'list'
  const [confirmDelete, setConfirmDelete] = useState(null);

  const weekDates = getWeekDates(currentWeek);

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Get courses visible this week (recurring or created this specific week)
  function getCoursesForCell(dayIdx, hour) {
    return data.courses.filter((c) => {
      if (c.dayIdx !== dayIdx) return false;
      if (c.startHour > hour || c.endHour <= hour) return false;
      if (c.recurring) return true;
      return c.weekId === currentWeek;
    });
  }

  function completionKey(courseId, weekId) {
    return `${courseId}__${weekId}`;
  }
  function isCompleted(courseId) {
    return !!data.completions[completionKey(courseId, currentWeek)];
  }

  function toggleCompletion(courseId) {
    const key = completionKey(courseId, currentWeek);
    setData((d) => ({
      ...d,
      completions: { ...d.completions, [key]: !d.completions[key] },
    }));
  }

  function openAddModal(dayIdx, hour) {
    setForm({
      name: "",
      colorIdx: 0,
      dayIdx,
      startHour: hour,
      endHour: HOURS[HOURS.indexOf(hour) + 1] || "09:00",
      recurring: true,
    });
    setModal({ type: "add" });
  }

  function openEditModal(course) {
    setForm({
      name: course.name,
      colorIdx: course.colorIdx,
      dayIdx: course.dayIdx,
      startHour: course.startHour,
      endHour: course.endHour,
      recurring: course.recurring,
    });
    setModal({ type: "edit", course });
  }

  function saveCourse() {
    if (!form.name.trim()) return;
    if (modal.type === "add") {
      const newCourse = {
        id: Date.now().toString(),
        name: form.name.trim(),
        colorIdx: form.colorIdx,
        dayIdx: form.dayIdx,
        startHour: form.startHour,
        endHour: form.endHour,
        recurring: form.recurring,
        weekId: currentWeek,
      };
      setData((d) => ({ ...d, courses: [...d.courses, newCourse] }));
    } else {
      setData((d) => ({
        ...d,
        courses: d.courses.map((c) =>
          c.id === modal.course.id
            ? {
                ...c,
                name: form.name.trim(),
                colorIdx: form.colorIdx,
                dayIdx: form.dayIdx,
                startHour: form.startHour,
                endHour: form.endHour,
                recurring: form.recurring,
              }
            : c,
        ),
      }));
    }
    setModal(null);
  }

  function deleteCourse(id) {
    setData((d) => ({ ...d, courses: d.courses.filter((c) => c.id !== id) }));
    setConfirmDelete(null);
    setModal(null);
  }

  function navWeek(dir) {
    const [year, week] = currentWeek.split("-W").map(Number);
    const d = new Date(
      getWeekDates(`${year}-W${String(week).padStart(2, "0")}`)[0],
    );
    d.setDate(d.getDate() + dir * 7);
    setCurrentWeek(getWeekId(d));
  }

  const isToday = (date) => {
    const t = new Date();
    return (
      date.getDate() === t.getDate() &&
      date.getMonth() === t.getMonth() &&
      date.getFullYear() === t.getFullYear()
    );
  };

  const isCurrentWeek = currentWeek === getWeekId(new Date());

  // Calculate completion stats for the week
  const weekCourses = data.courses.filter(
    (c) => c.recurring || c.weekId === currentWeek,
  );
  const uniqueWeekCourses = [
    ...new Map(weekCourses.map((c) => [c.id, c])).values(),
  ];
  const completedCount = uniqueWeekCourses.filter((c) =>
    isCompleted(c.id),
  ).length;
  const totalCount = uniqueWeekCourses.length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Get first and last hour that has a course
  const allStartHours = data.courses.map((c) => c.startHour);
  const allEndHours = data.courses.map((c) => c.endHour);
  const minHourIdx =
    allStartHours.length > 0
      ? Math.max(0, HOURS.indexOf(allStartHours.sort()[0]) - 1)
      : 0;
  const maxHourIdx =
    allEndHours.length > 0
      ? Math.min(
          HOURS.length - 1,
          HOURS.indexOf(allEndHours.sort().reverse()[0]) + 1,
        )
      : HOURS.length - 1;
  const visibleHours = HOURS.slice(minHourIdx, maxHourIdx + 1);

  // Build grid: track which cells are "spanned" so we don't render them
  function getCourseSpan(course) {
    const start = HOURS.indexOf(course.startHour);
    const end = HOURS.indexOf(course.endHour);
    return Math.max(1, end - start);
  }

  // For each cell, find the "first hour" course (to render spanning block)
  function getFirstHourCourse(dayIdx, hour) {
    return data.courses.filter((c) => {
      if (c.dayIdx !== dayIdx) return false;
      if (c.startHour !== hour) return false;
      if (c.recurring) return true;
      return c.weekId === currentWeek;
    });
  }

  function isCovered(dayIdx, hour) {
    return data.courses.some((c) => {
      if (c.dayIdx !== dayIdx) return false;
      if (c.startHour >= hour || c.endHour <= hour) return false;
      if (c.startHour === hour) return false;
      if (c.recurring) return true;
      return c.weekId === currentWeek;
    });
  }

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        minHeight: "100vh",
        background: "#F8F9FB",
        color: "#111",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={{ background: "#111", color: "#fff", padding: "0 24px" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "60px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "#3B82F6",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
              }}
            >
              📚
            </div>
            <span
              style={{
                fontWeight: "700",
                fontSize: "16px",
                letterSpacing: "-0.3px",
              }}
            >
              MonAgenda
            </span>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {["week", "list"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === tab ? "#3B82F6" : "transparent",
                  color: activeTab === tab ? "#fff" : "#aaa",
                  fontWeight: "500",
                  fontSize: "13px",
                  transition: "all .15s",
                }}
              >
                {tab === "week" ? "Semaine" : "Tous les cours"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}
      >
        {/* Week nav + stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => navWeek(-1)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "1.5px solid #E5E7EB",
                background: "#fff",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ‹
            </button>
            <div>
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "17px",
                  letterSpacing: "-0.4px",
                }}
              >
                {isCurrentWeek
                  ? "Cette semaine"
                  : `Semaine ${currentWeek.split("-W")[1]}`}
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280" }}>
                {formatDate(weekDates[0])} – {formatDate(weekDates[4])}
              </div>
            </div>
            <button
              onClick={() => navWeek(1)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "1.5px solid #E5E7EB",
                background: "#fff",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ›
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => setCurrentWeek(getWeekId(new Date()))}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #E5E7EB",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#6B7280",
                  fontWeight: "500",
                }}
              >
                Aujourd'hui
              </button>
            )}
          </div>

          {/* Progress */}
          {totalCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "13px", color: "#6B7280" }}>
                {completedCount}/{totalCount} cours
              </div>
              <div
                style={{
                  width: "120px",
                  height: "6px",
                  background: "#E5E7EB",
                  borderRadius: "99px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: progress === 100 ? "#10B981" : "#3B82F6",
                    borderRadius: "99px",
                    transition: "width .3s",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: progress === 100 ? "#10B981" : "#3B82F6",
                }}
              >
                {progress}%
              </div>
            </div>
          )}
        </div>

        {activeTab === "week" ? (
          /* WEEK VIEW */
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1.5px solid #E5E7EB",
              overflow: "hidden",
            }}
          >
            {/* Day headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "56px repeat(5, 1fr)",
                borderBottom: "1.5px solid #E5E7EB",
              }}
            >
              <div style={{ borderRight: "1.5px solid #F3F4F6" }} />
              {DAYS.map((day, i) => (
                <div
                  key={day}
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    borderRight: i < 4 ? "1.5px solid #F3F4F6" : "none",
                    background: isToday(weekDates[i])
                      ? "#EFF6FF"
                      : "transparent",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      letterSpacing: "1px",
                      color: isToday(weekDates[i]) ? "#3B82F6" : "#9CA3AF",
                    }}
                  >
                    {DAYS_SHORT[i]}
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: isToday(weekDates[i]) ? "#3B82F6" : "#111",
                      marginTop: "2px",
                    }}
                  >
                    {weekDates[i].getDate()}
                  </div>
                  {isToday(weekDates[i]) && (
                    <div
                      style={{
                        width: "4px",
                        height: "4px",
                        background: "#3B82F6",
                        borderRadius: "50%",
                        margin: "2px auto 0",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Time grid */}
            {HOURS.map((hour, hIdx) => (
              <div
                key={hour}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px repeat(5, 1fr)",
                  borderBottom:
                    hIdx < HOURS.length - 1 ? "1px solid #F3F4F6" : "none",
                  minHeight: "52px",
                }}
              >
                {/* Hour label */}
                <div
                  style={{
                    padding: "6px 8px 0",
                    borderRight: "1.5px solid #F3F4F6",
                    textAlign: "right",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "'DM Mono', monospace",
                      color: "#D1D5DB",
                      fontWeight: "500",
                    }}
                  >
                    {hour}
                  </span>
                </div>
                {/* Day cells */}
                {DAYS.map((_, dIdx) => {
                  const covered = isCovered(dIdx, hour);
                  const firstHourCourses = getFirstHourCourse(dIdx, hour);
                  return (
                    <div
                      key={dIdx}
                      style={{
                        borderRight: dIdx < 4 ? "1px solid #F3F4F6" : "none",
                        background: isToday(weekDates[dIdx])
                          ? "#FAFBFF"
                          : "transparent",
                        position: "relative",
                        padding: "3px",
                        minHeight: "52px",
                      }}
                    >
                      {!covered && firstHourCourses.length === 0 && (
                        <button
                          onClick={() => openAddModal(dIdx, hour)}
                          style={{
                            position: "absolute",
                            inset: "2px",
                            border: "1.5px dashed transparent",
                            background: "transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            transition: "all .15s",
                            fontSize: "16px",
                            color: "#D1D5DB",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "#D1D5DB";
                            e.currentTarget.style.opacity = "1";
                            e.currentTarget.style.background = "#F9FAFB";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "transparent";
                            e.currentTarget.style.opacity = "0";
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          +
                        </button>
                      )}
                      {firstHourCourses.map((course) => {
                        const span = getCourseSpan(course);
                        const color = COLORS[course.colorIdx % COLORS.length];
                        const done = isCompleted(course.id);
                        return (
                          <div
                            key={course.id}
                            style={{
                              position: "absolute",
                              left: "3px",
                              right: "3px",
                              top: "3px",
                              height: `calc(${span * 100}% + ${(span - 1) * 1}px - 6px)`,
                              background: done ? "#F9FAFB" : color.light,
                              border: `1.5px solid ${done ? "#E5E7EB" : color.border}`,
                              borderRadius: "8px",
                              padding: "6px 8px",
                              cursor: "pointer",
                              zIndex: 2,
                              transition: "all .15s",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              overflow: "hidden",
                            }}
                            onClick={() => openEditModal(course)}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: "4px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: done ? "#9CA3AF" : color.text,
                                  textDecoration: done
                                    ? "line-through"
                                    : "none",
                                  lineHeight: "1.3",
                                  flex: 1,
                                  overflow: "hidden",
                                  display: "-webkit-box",
                                  WebkitLineClamp: span > 1 ? 3 : 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {course.name}
                              </span>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompletion(course.id);
                                }}
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  borderRadius: "5px",
                                  flexShrink: 0,
                                  border: `2px solid ${done ? color.bg : color.border}`,
                                  background: done ? color.bg : "transparent",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "all .15s",
                                }}
                              >
                                {done && (
                                  <span
                                    style={{
                                      color: "#fff",
                                      fontSize: "10px",
                                      fontWeight: "700",
                                    }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                            </div>
                            {span > 1 && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: done ? "#D1D5DB" : color.text,
                                  opacity: 0.7,
                                  fontFamily: "'DM Mono', monospace",
                                }}
                              >
                                {course.startHour}–{course.endHour}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div>
            {data.courses.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "#9CA3AF",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
                <div style={{ fontWeight: "600", marginBottom: "6px" }}>
                  Aucun cours ajouté
                </div>
                <div style={{ fontSize: "14px" }}>
                  Va sur la vue Semaine et clique sur un créneau pour ajouter un
                  cours.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {DAYS.map((day, dIdx) => {
                  const dayCourses = data.courses.filter(
                    (c) => c.dayIdx === dIdx,
                  );
                  if (dayCourses.length === 0) return null;
                  return (
                    <div
                      key={day}
                      style={{
                        background: "#fff",
                        borderRadius: "14px",
                        border: "1.5px solid #E5E7EB",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #F3F4F6",
                          fontWeight: "700",
                          fontSize: "13px",
                          letterSpacing: "0.5px",
                          color: "#6B7280",
                        }}
                      >
                        {day.toUpperCase()}
                      </div>
                      {dayCourses
                        .sort((a, b) => a.startHour.localeCompare(b.startHour))
                        .map((course) => {
                          const color = COLORS[course.colorIdx % COLORS.length];
                          const done = isCompleted(course.id);
                          return (
                            <div
                              key={course.id}
                              style={{
                                padding: "12px 16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                borderBottom: "1px solid #F9FAFB",
                              }}
                            >
                              <div
                                style={{
                                  width: "3px",
                                  height: "36px",
                                  background: color.bg,
                                  borderRadius: "99px",
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: done ? "#9CA3AF" : "#111",
                                    textDecoration: done
                                      ? "line-through"
                                      : "none",
                                  }}
                                >
                                  {course.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#9CA3AF",
                                    fontFamily: "'DM Mono', monospace",
                                  }}
                                >
                                  {course.startHour}–{course.endHour} ·{" "}
                                  {course.recurring ? "Récurrent" : "Une fois"}
                                </div>
                              </div>
                              <div
                                onClick={() => toggleCompletion(course.id)}
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "6px",
                                  border: `2px solid ${done ? color.bg : "#D1D5DB"}`,
                                  background: done ? color.bg : "transparent",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "all .15s",
                                  flexShrink: 0,
                                }}
                              >
                                {done && (
                                  <span
                                    style={{
                                      color: "#fff",
                                      fontSize: "12px",
                                      fontWeight: "700",
                                    }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => openEditModal(course)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#D1D5DB",
                                  fontSize: "16px",
                                  padding: "4px",
                                }}
                              >
                                ✏️
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>
              {modal.type === "add" ? "Ajouter un cours" : "Modifier le cours"}
            </h2>
            <button
              onClick={() => setModal(null)}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#9CA3AF",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {/* Name */}
            <div>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#6B7280",
                  letterSpacing: "0.5px",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                NOM DU COURS
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex: Mathématiques, Histoire..."
                onKeyDown={(e) => e.key === "Enter" && saveCourse()}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1.5px solid #E5E7EB",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Day */}
            <div>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#6B7280",
                  letterSpacing: "0.5px",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                JOUR
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    onClick={() => setForm((f) => ({ ...f, dayIdx: i }))}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      borderRadius: "8px",
                      border: "1.5px solid",
                      borderColor: form.dayIdx === i ? "#3B82F6" : "#E5E7EB",
                      background: form.dayIdx === i ? "#EFF6FF" : "#fff",
                      color: form.dayIdx === i ? "#3B82F6" : "#6B7280",
                      fontWeight: "600",
                      fontSize: "11px",
                      cursor: "pointer",
                      transition: "all .1s",
                    }}
                  >
                    {DAYS_SHORT[i]}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {[
                ["startHour", "DÉBUT"],
                ["endHour", "FIN"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    {label}
                  </label>
                  <select
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #E5E7EB",
                      fontSize: "14px",
                      outline: "none",
                      fontFamily: "'DM Mono', monospace",
                      background: "#fff",
                    }}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Color */}
            <div>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#6B7280",
                  letterSpacing: "0.5px",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                COULEUR
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setForm((f) => ({ ...f, colorIdx: i }))}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: c.bg,
                      border: "none",
                      cursor: "pointer",
                      outline:
                        form.colorIdx === i ? `3px solid ${c.bg}` : "none",
                      outlineOffset: "2px",
                      transition: "all .1s",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Recurring */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: "#F9FAFB",
                borderRadius: "10px",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600" }}>
                  Cours récurrent
                </div>
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                  Apparaît toutes les semaines
                </div>
              </div>
              <button
                onClick={() =>
                  setForm((f) => ({ ...f, recurring: !f.recurring }))
                }
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "99px",
                  border: "none",
                  cursor: "pointer",
                  background: form.recurring ? "#3B82F6" : "#D1D5DB",
                  transition: "background .2s",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    background: "#fff",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "3px",
                    transition: "left .2s",
                    left: form.recurring ? "23px" : "3px",
                  }}
                />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
            {modal.type === "edit" && (
              <button
                onClick={() => setConfirmDelete(modal.course.id)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1.5px solid #FEE2E2",
                  background: "#FEF2F2",
                  color: "#EF4444",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Supprimer
              </button>
            )}
            <button
              onClick={() => setModal(null)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1.5px solid #E5E7EB",
                background: "#fff",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={saveCourse}
              disabled={!form.name.trim()}
              style={{
                flex: 2,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                background: form.name.trim() ? "#111" : "#E5E7EB",
                color: form.name.trim() ? "#fff" : "#9CA3AF",
                fontWeight: "700",
                fontSize: "13px",
                cursor: form.name.trim() ? "pointer" : "default",
                transition: "all .15s",
              }}
            >
              {modal.type === "add" ? "Ajouter" : "Enregistrer"}
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>
              Supprimer ce cours ?
            </h3>
            <p
              style={{ color: "#6B7280", fontSize: "13px", margin: "0 0 20px" }}
            >
              Cette action est irréversible. Toutes les cases cochées seront
              perdues.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1.5px solid #E5E7EB",
                  background: "#fff",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => deleteCourse(confirmDelete)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#EF4444",
                  color: "#fff",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
