import React, { useMemo, useState } from "react";

type WorkMark = "○" | "△" | "×";

type WorkData = {
  site: string;
  mark: WorkMark;
  price: number;
  invoice: boolean;
};

type WorkDataByDay = Record<number, WorkData>;
type WorkDataByMonth = Record<string, WorkDataByDay>;
type ClosingDaysByMonth = Record<string, number>;

const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const toCurrentMonthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

const markColor = (mark?: string) =>
  mark === "○" ? "#15803d" : mark === "△" ? "#d97706" : mark === "×" ? "#b91c1c" : "#888";

export default function App() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [allClosingDays, setAllClosingDays] = useState<ClosingDaysByMonth>({});
  const [allWorkData, setAllWorkData] = useState<WorkDataByMonth>({});
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const monthKey = toCurrentMonthKey(year, month);
  const closingDay = allClosingDays[monthKey] ?? 25;
  const workData = allWorkData[monthKey] ?? {};

  const prevDate = new Date(year, month - 2, 1);
  const prevMonthKey = toMonthKey(prevDate);
  const prevClosingDay = allClosingDays[prevMonthKey] ?? 25;
  const prevWorkData = allWorkData[prevMonthKey] ?? {};

  const setClosingDay = (value: number) => {
    const safeValue = Math.min(31, Math.max(1, value || 1));
    setAllClosingDays((current) => ({ ...current, [monthKey]: safeValue }));
  };

  const setCurrentMonthWorkData = (data: WorkDataByDay) => {
    setAllWorkData((current) => ({ ...current, [monthKey]: data }));
  };

  const prevMonth = () => {
    if (month === 1) {
      setYear((currentYear) => currentYear - 1);
      setMonth(12);
    } else {
      setMonth((currentMonth) => currentMonth - 1);
    }
    setSelectedDay(1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((currentYear) => currentYear + 1);
      setMonth(1);
    } else {
      setMonth((currentMonth) => currentMonth + 1);
    }
    setSelectedDay(1);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const normalizedClosingDay = Math.min(closingDay, daysInMonth);

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month - 1, day);
    return { day, week: weekDays[date.getDay()] };
  });

  const isInCurrentPeriod = (day: number) => day <= normalizedClosingDay;
  const selectedData = workData[selectedDay] || {
    site: "",
    mark: "○" as WorkMark,
    price: 22000,
    invoice: true,
  };

  const updateSelected = <K extends keyof WorkData>(key: K, value: WorkData[K]) => {
    setCurrentMonthWorkData({
      ...workData,
      [selectedDay]: { ...selectedData, [key]: value },
    });
  };

  const grouped = useMemo(() => {
    const map: Record<string, { site: string; invoice: boolean; days: string[]; total: number }> = {};

    const addEntry = (label: string, data: WorkData) => {
      if (!data.site || data.mark === "×") return;
      const key = `${data.site}-${data.invoice}`;
      if (!map[key]) map[key] = { site: data.site, invoice: data.invoice, days: [], total: 0 };
      map[key].days.push(label);
      map[key].total += data.mark === "△" ? data.price / 2 : data.price;
    };

    Object.entries(prevWorkData).forEach(([dayString, data]) => {
      const day = Number(dayString);
      if (day > prevClosingDay) addEntry(`前月${day}`, data);
    });

    Object.entries(workData).forEach(([dayString, data]) => {
      const day = Number(dayString);
      if (day <= normalizedClosingDay) addEntry(`${day}`, data);
    });

    return Object.values(map).map((group) => {
      const tax = group.invoice ? Math.floor(group.total * 0.1) : 0;
      return { ...group, tax, grand: group.total + tax };
    });
  }, [workData, prevWorkData, prevClosingDay, normalizedClosingDay]);

  const grandTotal = grouped.reduce((sum, group) => sum + group.grand, 0);

  const shareToLine = () => {
    const text = [
      `${year}年${month}月`,
      `締め期間：前月${prevClosingDay + 1}日〜${month}月${normalizedClosingDay}日`,
      "",
      ...grouped.map((group) =>
        [
          `【${group.site}】`,
          group.invoice ? "インボイス有" : "インボイス無",
          `日数: ${group.days.join(", ")}日`,
          `合計: ${group.grand.toLocaleString()}円`,
        ].join("\n"),
      ),
      "",
      `総合計 ${grandTotal.toLocaleString()}円`,
    ].join("\n\n");

    window.open(
      `https://social-plugins.line.me/lineit/share?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 16, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "white", borderRadius: 24, boxShadow: "0 4px 24px #0001", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={prevMonth} style={{ border: "1px solid #ddd", borderRadius: 12, padding: "6px 14px" }}>
            ←
          </button>
          <h1 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>
            {year}年 {month}月
          </h1>
          <button onClick={nextMonth} style={{ border: "1px solid #ddd", borderRadius: 12, padding: "6px 14px" }}>
            →
          </button>
        </div>

        <div style={{ background: "#f9fafb", borderRadius: 16, border: "1px solid #eee", padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "#888", margin: "0 0 6px" }}>
            集計期間：前月{prevClosingDay + 1}日 〜 当月{normalizedClosingDay}日
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#888" }}>当月締め日</span>
            <input
              type="number"
              min={1}
              max={daysInMonth}
              value={closingDay}
              onChange={(event) => setClosingDay(Number(event.target.value))}
              style={{ width: 60, padding: "6px 8px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}
            />
            <span style={{ fontSize: 13, color: "#888" }}>日</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 16 }}>
          {weekDays.map((week) => (
            <div
              key={week}
              style={{
                color: week === "日" ? "#dc2626" : week === "土" ? "#2563eb" : "#888",
                fontSize: 11,
                fontWeight: "bold",
                textAlign: "center",
                padding: "0 0 4px",
              }}
            >
              {week}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, index) => (
            <div key={`blank-${index}`} aria-hidden="true" />
          ))}
          {days.map((item) => {
            const data = workData[item.day];
            const inPeriod = isInCurrentPeriod(item.day);
            const isSelected = selectedDay === item.day;
            const isClosing = item.day === normalizedClosingDay;

            return (
              <button
                key={item.day}
                onClick={() => setSelectedDay(item.day)}
                style={{
                  borderRadius: 10,
                  border: isSelected ? "2px solid #3b82f6" : isClosing ? "1.5px dashed #93c5fd" : "1px solid #eee",
                  padding: "4px 2px",
                  minHeight: 72,
                  fontSize: 12,
                  cursor: "pointer",
                  background: isSelected ? "#dbeafe" : inPeriod ? "white" : "#f9fafb",
                  opacity: inPeriod ? 1 : 0.45,
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: 13 }}>{item.day}</div>
                <div style={{ fontSize: 10, color: item.week === "日" ? "#dc2626" : item.week === "土" ? "#2563eb" : "#aaa" }}>{item.week}</div>
                <div style={{ fontSize: 14, color: markColor(data?.mark), marginTop: 2 }}>{data?.mark || "-"}</div>
                <div style={{ fontSize: 9, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>
                  {data?.site || ""}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ background: "#f9fafb", borderRadius: 16, border: "1px solid #eee", padding: 12, marginBottom: 12 }}>
          <p style={{ fontWeight: "bold", fontSize: 15, margin: "0 0 8px" }}>
            {year}年{month}月{selectedDay}日
            {!isInCurrentPeriod(selectedDay) && <span style={{ fontSize: 12, color: "#d97706", fontWeight: "normal" }}> （集計期間外）</span>}
          </p>

          {!isInCurrentPeriod(selectedDay) && (
            <p style={{ fontSize: 12, color: "#92400e", background: "#fef3c7", borderRadius: 8, padding: "4px 8px", margin: "0 0 8px" }}>
              この日は締め期間外のため集計に含まれません
            </p>
          )}

          <input
            value={selectedData.site}
            onChange={(event) => updateSelected("site", event.target.value)}
            placeholder="現場名"
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 8, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10, fontSize: 14 }}
          />

          <select
            value={selectedData.mark}
            onChange={(event) => updateSelected("mark", event.target.value as WorkMark)}
            style={{ width: "100%", marginBottom: 8, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10, fontSize: 14 }}
          >
            <option value="○">○ 1日</option>
            <option value="△">△ 半日</option>
            <option value="×">× 休み</option>
          </select>

          <label style={{ fontSize: 13, color: "#888", marginBottom: 4, display: "block" }}>日当</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <input
              type="number"
              value={selectedData.price}
              step={100}
              onChange={(event) => updateSelected("price", Number(event.target.value))}
              style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10, fontSize: 14 }}
            />
            <span style={{ fontSize: 14, color: "#555" }}>円</span>
          </div>

          <button
            onClick={() => updateSelected("invoice", !selectedData.invoice)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 14,
              background: selectedData.invoice ? "#15803d" : "#6b7280",
              color: "white",
            }}
          >
            {selectedData.invoice ? "✓ インボイス有" : "インボイス無"}
          </button>
        </div>

        <div style={{ background: "#eff6ff", borderRadius: 16, padding: 12, marginBottom: 12 }}>
          <h2 style={{ fontWeight: "bold", fontSize: 16, margin: "0 0 4px" }}>現場別集計</h2>
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>
            前月{prevClosingDay + 1}日 〜 {month}月{normalizedClosingDay}日
          </p>

          {grouped.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>データがありません</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {grouped.map((group, index) => (
              <div key={`${group.site}-${group.invoice}-${index}`} style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 14 }}>
                  <span>{group.site}</span>
                  <span style={{ fontSize: 12, color: group.invoice ? "#15803d" : "#aaa" }}>{group.invoice ? "インボイス有" : "インボイス無"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>日: {group.days.join(", ")}日</div>
                <div style={{ fontSize: 12, color: "#888" }}>税抜: {group.total.toLocaleString()}円</div>
                {group.invoice && <div style={{ fontSize: 12, color: "#888" }}>消費税: {group.tax.toLocaleString()}円</div>}
                <div style={{ fontWeight: "bold", fontSize: 14, marginTop: 4 }}>合計: {group.grand.toLocaleString()}円</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #bfdbfe", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 16 }}>
            <span>総合計</span>
            <span>{grandTotal.toLocaleString()}円</span>
          </div>
        </div>

        <button
          onClick={shareToLine}
          style={{ width: "100%", background: "#06c755", color: "white", border: "none", borderRadius: 16, padding: 14, fontWeight: "bold", fontSize: 15, cursor: "pointer" }}
        >
          LINEで共有
        </button>
      </div>
    </div>
  );
}
