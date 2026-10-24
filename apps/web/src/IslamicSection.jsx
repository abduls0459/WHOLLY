import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Compass, Flower2, Minus, Plus, RotateCcw } from "lucide-react";
import { getIslamicData, saveIslamicData } from "./lib/api";
const prayers = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];
const dhikrDefaults = [
  { id: "subhanallah", name: "SubhanAllah", target: 33 },
  { id: "alhamdulillah", name: "Alhamdulillah", target: 33 },
  { id: "allahu-akbar", name: "Allahu Akbar", target: 34 }
];
const surahs = [
  ["Al-Fatihah", 7],
  ["Al-Baqarah", 286],
  ["Ali Imran", 200],
  ["An-Nisa", 176],
  ["Al-Maidah", 120],
  ["Al-Anam", 165],
  ["Al-Araf", 206],
  ["Al-Anfal", 75],
  ["At-Tawbah", 129],
  ["Yunus", 109],
  ["Hud", 123],
  ["Yusuf", 111],
  ["Ar-Rad", 43],
  ["Ibrahim", 52],
  ["Al-Hijr", 99],
  ["An-Nahl", 128],
  ["Al-Isra", 111],
  ["Al-Kahf", 110],
  ["Maryam", 98],
  ["Ta-Ha", 135],
  ["Al-Anbiya", 112],
  ["Al-Hajj", 78],
  ["Al-Muminun", 118],
  ["An-Nur", 64],
  ["Al-Furqan", 77],
  ["Ash-Shuara", 227],
  ["An-Naml", 93],
  ["Al-Qasas", 88],
  ["Al-Ankabut", 69],
  ["Ar-Rum", 60],
  ["Luqman", 34],
  ["As-Sajdah", 30],
  ["Al-Ahzab", 73],
  ["Saba", 54],
  ["Fatir", 45],
  ["Ya-Sin", 83],
  ["As-Saffat", 182],
  ["Sad", 88],
  ["Az-Zumar", 75],
  ["Ghafir", 85],
  ["Fussilat", 54],
  ["Ash-Shura", 53],
  ["Az-Zukhruf", 89],
  ["Ad-Dukhan", 59],
  ["Al-Jathiyah", 37],
  ["Al-Ahqaf", 35],
  ["Muhammad", 38],
  ["Al-Fath", 29],
  ["Al-Hujurat", 18],
  ["Qaf", 45],
  ["Adh-Dhariyat", 60],
  ["At-Tur", 49],
  ["An-Najm", 62],
  ["Al-Qamar", 55],
  ["Ar-Rahman", 78],
  ["Al-Waqiah", 96],
  ["Al-Hadid", 29],
  ["Al-Mujadilah", 22],
  ["Al-Hashr", 24],
  ["Al-Mumtahanah", 13],
  ["As-Saff", 14],
  ["Al-Jumuah", 11],
  ["Al-Munafiqun", 11],
  ["At-Taghabun", 18],
  ["At-Talaq", 12],
  ["At-Tahrim", 12],
  ["Al-Mulk", 30],
  ["Al-Qalam", 52],
  ["Al-Haqqah", 52],
  ["Al-Maarij", 44],
  ["Nuh", 28],
  ["Al-Jinn", 28],
  ["Al-Muzzammil", 20],
  ["Al-Muddaththir", 56],
  ["Al-Qiyamah", 40],
  ["Al-Insan", 31],
  ["Al-Mursalat", 50],
  ["An-Naba", 40],
  ["An-Naziat", 46],
  ["Abasa", 42],
  ["At-Takwir", 29],
  ["Al-Infitar", 19],
  ["Al-Mutaffifin", 36],
  ["Al-Inshiqaq", 25],
  ["Al-Buruj", 22],
  ["At-Tariq", 17],
  ["Al-Ala", 19],
  ["Al-Ghashiyah", 26],
  ["Al-Fajr", 30],
  ["Al-Balad", 20],
  ["Ash-Shams", 15],
  ["Al-Layl", 21],
  ["Ad-Duha", 11],
  ["Ash-Sharh", 8],
  ["At-Tin", 8],
  ["Al-Alaq", 19],
  ["Al-Qadr", 5],
  ["Al-Bayyinah", 8],
  ["Az-Zalzalah", 8],
  ["Al-Adiyat", 11],
  ["Al-Qariah", 11],
  ["At-Takathur", 8],
  ["Al-Asr", 3],
  ["Al-Humazah", 9],
  ["Al-Fil", 5],
  ["Quraysh", 4],
  ["Al-Maun", 7],
  ["Al-Kawthar", 3],
  ["Al-Kafirun", 6],
  ["An-Nasr", 3],
  ["Al-Masad", 5],
  ["Al-Ikhlas", 4],
  ["Al-Falaq", 5],
  ["An-Nas", 6]
];
const quranTotal = 6236;
const juzStarts = [[1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41], [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]];
const importantDays = [
  { month: 1, day: 1, label: "Islamic New Year" },
  { month: 1, day: 10, label: "Ashura" },
  { month: 3, day: 12, label: "Mawlid \xB7 commonly observed" },
  { month: 7, day: 27, label: "Isra and Mi\u2019raj \xB7 commonly observed" },
  { month: 8, day: 15, label: "Mid-Sha\u2019ban \xB7 commonly observed" },
  { month: 9, day: 1, label: "Start of Ramadan" },
  { month: 10, day: 1, label: "Eid al-Fitr" },
  { month: 12, day: 9, label: "Day of Arafah" },
  { month: 12, day: 10, label: "Eid al-Adha" },
  ...[21, 23, 25, 27, 29].map((day) => ({ month: 9, day, label: "Odd night of the last ten nights of Ramadan" }))
];
function todayKey(date = /* @__PURE__ */ new Date(), timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}
function addDateDays(dateKey, days) {
  const date = new Date(dateKey + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function normalizeData(parsed = {}) {
  return {
    prayers: parsed.prayers ?? {},
    tahajjud: parsed.tahajjud ?? {},
    readings: parsed.readings ?? [],
    counts: parsed.counts ?? {},
    khatam: parsed.khatam ?? 0,
    dhikr: parsed.dhikr?.length ? parsed.dhikr : [...dhikrDefaults]
  };
}
function loadData(key) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return normalizeData(JSON.parse(stored));
  } catch {
  }
  return normalizeData();
}
function globalAyah(surah, ayah) {
  return surahs.slice(0, surah - 1).reduce((sum, item) => sum + item[1], 0) + ayah;
}
function coveredAyahs(readings) {
  const ayahs = /* @__PURE__ */ new Set();
  for (const reading of readings) for (let ayah = reading.from; ayah <= reading.to; ayah += 1) ayahs.add(globalAyah(reading.surah, ayah));
  return ayahs;
}
function parts(date, calendar) {
  return Object.fromEntries(new Intl.DateTimeFormat(`en-u-ca-${calendar}`, { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(date).map((part) => [part.type, part.value]));
}
function qiblaBearing(latitude, longitude) {
  const radians = Math.PI / 180;
  const kaabaLat = 21.4225 * radians;
  const kaabaLng = 39.8262 * radians;
  const lat = latitude * radians;
  const deltaLng = kaabaLng - longitude * radians;
  return (Math.atan2(Math.sin(deltaLng), Math.cos(lat) * Math.tan(kaabaLat) - Math.sin(lat) * Math.cos(deltaLng)) / radians + 360) % 360;
}
function IslamicSection({ profile }) {
  const storageKey = `wholly.islamic.${profile.id}`;
  const timezone = profile.timezone || "UTC";
  const [data, setData] = useState(() => loadData(storageKey));
  const [dataReady, setDataReady] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [section, setSection] = useState("Prayers");
  const [selectedDate, setSelectedDate] = useState(todayKey(new Date(), timezone));
  const [surah, setSurah] = useState(1);
  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(7);
  const [location, setLocation] = useState(null);
  const locationRef = useRef(null);
  const [heading, setHeading] = useState(null);
  const [qiblaAligned, setQiblaAligned] = useState(false);
  const previousAlignment = useRef(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1));
  const [newDhikr, setNewDhikr] = useState("");
  useEffect(() => {
    let current = true;
    async function loadFromAccount() {
      try {
        const result = await getIslamicData();
        if (result.data) {
          localStorage.removeItem(storageKey);
          if (current) { setData(normalizeData(result.data)); setCanSave(true); }
        } else {
          const legacy = loadData(storageKey);
          await saveIslamicData(legacy);
          localStorage.removeItem(storageKey);
          if (current) { setData(legacy); setCanSave(true); }
        }
      } catch (cause) {
        if (current) setSyncError(cause instanceof Error ? cause.message : "Could not load Islamic tracking.");
      } finally {
        if (current) setDataReady(true);
      }
    }
    void loadFromAccount();
    return () => {
      current = false;
    };
  }, [storageKey]);
  useEffect(() => {
    if (!dataReady || !canSave) return void 0;
    const timeout = window.setTimeout(() => {
      void saveIslamicData(data).then(() => setSyncError("")).catch((cause) => {
        setSyncError(cause instanceof Error ? cause.message : "Could not save Islamic tracking.");
      });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [data, dataReady, canSave]);
  const today = todayKey(new Date(), timezone);
  const currentPrayers = data.prayers[selectedDate] ?? [];
  const activeDhikr = data.dhikr.filter((item) => !item.archived);
  const covered = useMemo(() => coveredAyahs(data.readings), [data.readings]);
  const coverage = Math.min(100, covered.size / quranTotal * 100);
  const hijriDate = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: timezone, day: "numeric", month: "long", year: "numeric" }).format(/* @__PURE__ */ new Date());
  const tahajjudStreak = (() => {
    let date = today;
    if (!data.tahajjud[date]) date = addDateDays(date, -1);
    let days = 0;
    while (data.tahajjud[date]) {
      days += 1;
      date = addDateDays(date, -1);
    }
    return days;
  })();
  function togglePrayer(name) {
    setData((current) => {
      const list = current.prayers[selectedDate] ?? [];
      return { ...current, prayers: { ...current.prayers, [selectedDate]: list.includes(name) ? list.filter((item) => item !== name) : [...list, name] } };
    });
  }
  function saveReading(surahNumber, start, end) {
    if (start < 1 || end < start || end > surahs[surahNumber - 1][1]) return;
    saveGlobalRange(globalAyah(surahNumber, start), globalAyah(surahNumber, end));
  }
  function saveGlobalRange(offset, final) {
    const entries = [];
    let remaining = offset;
    let endRemaining = final;
    for (let index = 1; index <= surahs.length && remaining <= endRemaining; index += 1) {
      const count = surahs[index - 1][1];
      const first = Math.max(1, remaining - globalAyah(index, 1) + 1);
      const last = Math.min(count, endRemaining - globalAyah(index, 1) + 1);
      if (first <= last) entries.push({ id: crypto.randomUUID(), surah: index, from: first, to: last, date: today });
      remaining = globalAyah(index, 1) + count;
    }
    setData((current) => {
      const readings = [...current.readings, ...entries];
      return coveredAyahs(readings).size >= quranTotal ? { ...current, readings: [], khatam: current.khatam + 1 } : { ...current, readings };
    });
  }
  function markJuz(number) {
    const [startSurah, startAyah] = juzStarts[number - 1];
    const end = juzStarts[number] ? globalAyah(juzStarts[number][0], juzStarts[number][1]) - 1 : quranTotal;
    saveGlobalRange(globalAyah(startSurah, startAyah), end);
  }
  function moveDhikr(id, direction) {
    setData((current) => {
      const items = [...current.dhikr];
      const from = items.findIndex((item) => item.id === id);
      const to = Math.max(0, Math.min(items.length - 1, from + direction));
      [items[from], items[to]] = [items[to], items[from]];
      return { ...current, dhikr: items };
    });
  }
  function requestQibla() {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const next = { lat: coords.latitude, lng: coords.longitude };
      locationRef.current = next;
      setLocation(next);
    }, () => {
      locationRef.current = null;
      setLocation(null);
    }, { timeout: 1e4 });
    const device = DeviceOrientationEvent;
    const listen = () => {
      window.addEventListener("deviceorientationabsolute", onOrientation, true);
      window.addEventListener("deviceorientation", onOrientation, true);
    };
    function onOrientation(event) {
      const value = event;
      const angle = value.webkitCompassHeading ?? (value.alpha == null ? null : 360 - value.alpha);
      if (angle != null) {
        setHeading(angle);
        if (locationRef.current) {
          const difference = Math.abs((qiblaBearing(locationRef.current.lat, locationRef.current.lng) - angle + 540) % 360 - 180);
          const aligned = difference <= 3;
          setQiblaAligned(aligned);
          if (aligned && !previousAlignment.current) navigator.vibrate?.(100);
          previousAlignment.current = aligned;
        }
      }
    }
    if (device.requestPermission) void device.requestPermission().then((result) => {
      if (result === "granted") listen();
    });
    else listen();
  }
  const tabs = ["Prayers", "Tahajjud", "Quran", "Dhikr", "Qibla", "Calendar"];
  return /* @__PURE__ */ jsxs("section", { className: "islamic-page", children: [
    /* @__PURE__ */ jsxs("div", { className: "islamic-heading", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "auth-kicker", children: "YOUR WORSHIP" }),
        /* @__PURE__ */ jsx("h1", { children: "Islamic" }),
        /* @__PURE__ */ jsxs("p", { children: [
          hijriDate,
          " \xB7 ",
          new Intl.DateTimeFormat(void 0, { timeZone: timezone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(/* @__PURE__ */ new Date())
        ] })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "islamic-mark", children: /* @__PURE__ */ jsx(Flower2, { size: 22 }) })
    ] }),
    syncError && /* @__PURE__ */ jsx("p", { className: "form-error", role: "alert", children: syncError }),
    !dataReady && /* @__PURE__ */ jsx("p", { className: "islamic-note", role: "status", children: "Loading your saved tracking\u2026" }),
    /* @__PURE__ */ jsx("nav", { className: "islamic-tabs", "aria-label": "Islamic features", children: tabs.map((tab) => /* @__PURE__ */ jsx("button", { className: section === tab ? "islamic-tab active" : "islamic-tab", onClick: () => setSection(tab), children: tab }, tab)) }),
    dataReady && section === "Prayers" && /* @__PURE__ */ jsxs("div", { className: "islamic-columns", children: [
      /* @__PURE__ */ jsxs("article", { className: "islamic-card prayer-list-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "islamic-card-heading", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "FIVE DAILY PRAYERS" }),
            /* @__PURE__ */ jsxs("h2", { children: [
              currentPrayers.length,
              " of 5 ",
              selectedDate === today ? "today" : selectedDate
            ] })
          ] }),
          /* @__PURE__ */ jsx("input", { "aria-label": "Prayer log date", type: "date", value: selectedDate, max: today, onChange: (event) => setSelectedDate(event.target.value) })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "islamic-note", children: "Prayer times will appear here when a location and prayer-time source are available." }),
        /* @__PURE__ */ jsx("div", { className: "prayer-week-grid", children: Array.from({ length: 7 }, (_, index) => {
          const key = addDateDays(today, index - 6);
          const date = new Date(key + "T12:00:00Z");
          const count = data.prayers[key]?.length ?? 0;
          return /* @__PURE__ */ jsxs("button", { className: selectedDate === key ? "prayer-week-day selected" : "prayer-week-day", onClick: () => setSelectedDate(key), children: [
            /* @__PURE__ */ jsx("small", { children: date.toLocaleDateString(void 0, { timeZone: timezone, weekday: "short" }) }),
            /* @__PURE__ */ jsx("strong", { children: date.getDate() }),
            /* @__PURE__ */ jsxs("i", { children: [
              count,
              "/5"
            ] })
          ] }, key);
        }) }),
        /* @__PURE__ */ jsx("div", { className: "islamic-prayer-list", children: prayers.map((prayer) => /* @__PURE__ */ jsxs("button", { className: `islamic-prayer-row ${currentPrayers.includes(prayer) ? "complete" : ""}`, onClick: () => togglePrayer(prayer), children: [
          /* @__PURE__ */ jsx("span", { className: "prayer-dot", children: currentPrayers.includes(prayer) ? /* @__PURE__ */ jsx(Check, { size: 14 }) : null }),
          /* @__PURE__ */ jsx("span", { children: prayer }),
          /* @__PURE__ */ jsx("span", { className: "prayer-time-unavailable", children: "Time unavailable" }),
          /* @__PURE__ */ jsxs("span", { className: "prayer-action", children: [
            currentPrayers.includes(prayer) ? "Undo" : "Mark done",
            selectedDate < today && !currentPrayers.includes(prayer) ? " \xB7 late entry" : ""
          ] })
        ] }, prayer)) })
      ] }),
      /* @__PURE__ */ jsxs("article", { className: "islamic-card", children: [
        /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "PRAYER TRACKING" }),
        /* @__PURE__ */ jsx("h2", { children: "One day at a time" }),
        /* @__PURE__ */ jsx("p", { children: "Use the date picker or seven-day grid to review earlier days. Past entries are recorded as late entries and do not restart reminders." }),
        /* @__PURE__ */ jsx("div", { className: "islamic-callout", children: "Prayer times and repeating reminders need the location-based time source described in the developer spec." })
      ] })
    ] }),
    dataReady && section === "Tahajjud" && /* @__PURE__ */ jsxs("div", { className: "islamic-columns", children: [
      /* @__PURE__ */ jsxs("article", { className: "islamic-card", children: [
        /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "EXTRA-CURRICULAR PRAYER" }),
        /* @__PURE__ */ jsx("h2", { children: "Tahajjud" }),
        /* @__PURE__ */ jsx("p", { children: "Log a night prayer separately from the five daily prayers." }),
        /* @__PURE__ */ jsxs("label", { className: "islamic-field", children: [
          "Night ending date",
          /* @__PURE__ */ jsx("input", { type: "date", value: selectedDate, max: today, onChange: (event) => setSelectedDate(event.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "islamic-toggle", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: Boolean(data.tahajjud[selectedDate]), onChange: (event) => setData((current) => ({ ...current, tahajjud: event.target.checked ? { ...current.tahajjud, [selectedDate]: { rakaat: current.tahajjud[selectedDate]?.rakaat ?? 2, note: current.tahajjud[selectedDate]?.note ?? "" } } : Object.fromEntries(Object.entries(current.tahajjud).filter(([date]) => date !== selectedDate)) })) }),
          /* @__PURE__ */ jsx("span", { children: "Mark Tahajjud complete" })
        ] }),
        data.tahajjud[selectedDate] && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("label", { className: "islamic-field", children: [
            "Rakaat (2\u201312)",
            /* @__PURE__ */ jsx("input", { type: "number", min: "2", max: "12", step: "2", value: data.tahajjud[selectedDate].rakaat, onChange: (event) => setData((current) => ({ ...current, tahajjud: { ...current.tahajjud, [selectedDate]: { ...current.tahajjud[selectedDate], rakaat: Number(event.target.value) } } })) })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "islamic-field", children: [
            "Note",
            /* @__PURE__ */ jsx("textarea", { maxLength: 500, value: data.tahajjud[selectedDate].note, onChange: (event) => setData((current) => ({ ...current, tahajjud: { ...current.tahajjud, [selectedDate]: { ...current.tahajjud[selectedDate], note: event.target.value } } })) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("article", { className: "islamic-card", children: [
        /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "PRIVATE COUNTER" }),
        /* @__PURE__ */ jsxs("h2", { children: [
          tahajjudStreak,
          " night streak"
        ] }),
        /* @__PURE__ */ jsx("p", { children: "Your Tahajjud entries stay separate from the five-prayer count." })
      ] })
    ] }),
    dataReady && section === "Quran" && /* @__PURE__ */ jsxs("div", { className: "islamic-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "quran-summary", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "CURRENT READING" }),
          /* @__PURE__ */ jsxs("h2", { children: [
            coverage.toFixed(1),
            "% complete"
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "islamic-note", children: [
            "Read today: ",
            data.readings.filter((item) => item.date === today).reduce((sum, item) => sum + item.to - item.from + 1, 0),
            " ayahs"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "progress-track", children: /* @__PURE__ */ jsx("span", { style: { width: `${coverage}%` } }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "khatam-count", children: [
          /* @__PURE__ */ jsx("strong", { children: data.khatam }),
          /* @__PURE__ */ jsx("span", { children: "Khatam" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "quran-entry-form", children: [
        /* @__PURE__ */ jsxs("label", { className: "islamic-field", children: [
          "Surah",
          /* @__PURE__ */ jsxs("select", { value: surah, onChange: (event) => {
            const value = Number(event.target.value);
            setSurah(value);
            const unread = Array.from({ length: surahs[value - 1][1] }, (_, index) => index + 1).find((ayah) => !covered.has(globalAyah(value, ayah))) ?? surahs[value - 1][1];
            setFromAyah(unread);
            setToAyah(unread);
          }, children: [
            /* @__PURE__ */ jsx("option", { value: "", disabled: true, children: "Select a Surah" }),
            surahs.map(([name], index) => /* @__PURE__ */ jsxs("option", { value: index + 1, children: [
              index + 1,
              ". ",
              name
            ] }, name))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "islamic-field", children: [
          "From ayah",
          /* @__PURE__ */ jsx("input", { type: "number", min: "1", max: surahs[surah - 1][1], value: fromAyah, onChange: (event) => setFromAyah(Number(event.target.value)) })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "islamic-field", children: [
          "To ayah",
          /* @__PURE__ */ jsx("input", { type: "number", min: "1", max: surahs[surah - 1][1], value: toAyah, onChange: (event) => setToAyah(Number(event.target.value)) })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "islamic-primary", onClick: () => saveReading(surah, fromAyah, toAyah), children: "Log reading" }),
        /* @__PURE__ */ jsx("button", { className: "islamic-secondary", onClick: () => saveReading(surah, 1, surahs[surah - 1][1]), children: "Mark whole Surah" })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "JUZ PROGRESS" }),
      /* @__PURE__ */ jsx("div", { className: "juz-grid", children: juzStarts.map(([startSurah, startAyah], index) => {
        const start = globalAyah(startSurah, startAyah);
        const end = juzStarts[index + 1] ? globalAyah(juzStarts[index + 1][0], juzStarts[index + 1][1]) - 1 : quranTotal;
        const done = [...covered].filter((ayah) => ayah >= start && ayah <= end).length;
        return /* @__PURE__ */ jsxs("button", { className: `juz-tile ${done === end - start + 1 ? "juz-done" : ""}`, onClick: () => markJuz(index + 1), "aria-label": `Mark Juz ${index + 1} complete`, children: [
          /* @__PURE__ */ jsxs("strong", { children: [
            "Juz ",
            index + 1
          ] }),
          /* @__PURE__ */ jsxs("small", { children: [
            done,
            "/",
            end - start + 1
          ] })
        ] }, index);
      }) }),
      /* @__PURE__ */ jsx("div", { className: "surah-progress-list", children: surahs.map(([name, total], index) => {
        const offset = surahs.slice(0, index).reduce((sum, item) => sum + item[1], 0);
        const done = Array.from({ length: total }, (_, ayah) => covered.has(offset + ayah + 1)).filter(Boolean).length;
        return /* @__PURE__ */ jsxs("div", { className: "surah-progress", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            index + 1,
            ". ",
            name
          ] }),
          /* @__PURE__ */ jsx("div", { className: "progress-track", children: /* @__PURE__ */ jsx("span", { style: { width: `${done / total * 100}%` } }) }),
          /* @__PURE__ */ jsxs("small", { children: [
            done,
            "/",
            total
          ] })
        ] }, name);
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "reading-history", children: [
        /* @__PURE__ */ jsx("strong", { children: "Recent readings" }),
        data.readings.slice(-5).reverse().map((reading) => /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("span", { children: [
            surahs[reading.surah - 1][0],
            " \xB7 ",
            reading.from,
            "\u2013",
            reading.to
          ] }),
          /* @__PURE__ */ jsx("button", { "aria-label": "Undo reading", onClick: () => setData((current) => ({ ...current, readings: current.readings.filter((item) => item.id !== reading.id) })), children: /* @__PURE__ */ jsx(RotateCcw, { size: 14 }) })
        ] }, reading.id))
      ] }),
      /* @__PURE__ */ jsx("p", { className: "islamic-note", children: "Quran text and audio are not displayed." })
    ] }),
    dataReady && section === "Dhikr" && /* @__PURE__ */ jsxs("div", { className: "dhikr-grid", children: [
      activeDhikr.map((item) => {
        const count = data.counts[today]?.[item.id] ?? 0;
        return /* @__PURE__ */ jsxs("article", { className: "islamic-card dhikr-card", children: [
          /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "DAILY DHIKR" }),
          /* @__PURE__ */ jsx("input", { className: "dhikr-title", "aria-label": `Rename ${item.name}`, value: item.name, onChange: (event) => setData((current) => ({ ...current, dhikr: current.dhikr.map((type) => type.id === item.id ? { ...type, name: event.target.value } : type) })) }),
          /* @__PURE__ */ jsxs("button", { className: "dhikr-counter", "aria-label": `Count ${item.name}`, onClick: () => {
            navigator.vibrate?.(15);
            setData((current) => ({ ...current, counts: { ...current.counts, [today]: { ...current.counts[today], [item.id]: (current.counts[today]?.[item.id] ?? 0) + 1 } } }));
          }, children: [
            /* @__PURE__ */ jsx("strong", { children: count }),
            /* @__PURE__ */ jsxs("span", { children: [
              "of ",
              item.target
            ] }),
            /* @__PURE__ */ jsx("i", { style: { background: `conic-gradient(#728d6c ${Math.min(100, count / item.target * 100)}%, #edf0e9 0)` }, children: /* @__PURE__ */ jsx("b", { children: /* @__PURE__ */ jsx(Plus, { size: 21 }) }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "dhikr-actions", children: [
            /* @__PURE__ */ jsxs("button", { onClick: () => setData((current) => ({ ...current, counts: { ...current.counts, [today]: { ...current.counts[today], [item.id]: Math.max(0, (current.counts[today]?.[item.id] ?? 0) - 1) } } })), children: [
              /* @__PURE__ */ jsx(Minus, { size: 14 }),
              " Undo last tap"
            ] }),
            /* @__PURE__ */ jsxs("button", { onClick: () => setData((current) => ({ ...current, counts: { ...current.counts, [today]: { ...current.counts[today], [item.id]: 0 } } })), children: [
              /* @__PURE__ */ jsx(RotateCcw, { size: 14 }),
              " Reset today"
            ] }),
            /* @__PURE__ */ jsx("button", { onClick: () => setData((current) => ({ ...current, dhikr: current.dhikr.map((type) => type.id === item.id ? { ...type, archived: true } : type) })), children: "Archive" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "dhikr-order", children: [
            /* @__PURE__ */ jsxs("button", { onClick: () => moveDhikr(item.id, -1), "aria-label": `Move ${item.name} up`, children: [
              /* @__PURE__ */ jsx(ArrowUp, { size: 14 }),
              " Move up"
            ] }),
            /* @__PURE__ */ jsxs("button", { onClick: () => moveDhikr(item.id, 1), "aria-label": `Move ${item.name} down`, children: [
              /* @__PURE__ */ jsx(ArrowDown, { size: 14 }),
              " Move down"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "islamic-field", children: [
            "Daily target",
            /* @__PURE__ */ jsx("input", { type: "number", min: "1", max: "10000", value: item.target, onChange: (event) => setData((current) => ({ ...current, dhikr: current.dhikr.map((type) => type.id === item.id ? { ...type, target: Number(event.target.value) } : type) })) })
          ] })
        ] }, item.id);
      }),
      /* @__PURE__ */ jsxs("article", { className: "islamic-card dhikr-add", children: [
        /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "YOUR DHIKR CARDS" }),
        /* @__PURE__ */ jsx("h2", { children: "Add a Dhikr" }),
        /* @__PURE__ */ jsxs("div", { className: "dhikr-add-row", children: [
          /* @__PURE__ */ jsx("input", { "aria-label": "Name for new Dhikr", value: newDhikr, maxLength: 60, onChange: (event) => setNewDhikr(event.target.value), placeholder: "Name" }),
          /* @__PURE__ */ jsx("button", { className: "islamic-primary", onClick: () => {
            if (!newDhikr.trim()) return;
            setData((current) => ({ ...current, dhikr: [...current.dhikr, { id: crypto.randomUUID(), name: newDhikr.trim(), target: 33 }] }));
            setNewDhikr("");
          }, children: "Add" })
        ] }),
        data.dhikr.filter((item) => item.archived).map((item) => /* @__PURE__ */ jsxs("div", { className: "dhikr-manage", children: [
          /* @__PURE__ */ jsx("span", { children: item.name }),
          /* @__PURE__ */ jsx("button", { onClick: () => setData((current) => ({ ...current, dhikr: current.dhikr.map((type) => type.id === item.id ? { ...type, archived: false } : type) })), children: "Restore" })
        ] }, item.id))
      ] })
    ] }),
    dataReady && section === "Qibla" && /* @__PURE__ */ jsx("div", { className: "islamic-columns", children: /* @__PURE__ */ jsxs("article", { className: "islamic-card qibla-card", children: [
      /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "QIBLA DIRECTION" }),
      /* @__PURE__ */ jsx("h2", { children: "Find the direction" }),
      /* @__PURE__ */ jsx("p", { children: "Your location is used on this device to calculate the bearing. It is not sent to a server." }),
      /* @__PURE__ */ jsxs("div", { className: `qibla-dial ${qiblaAligned ? "qibla-aligned" : ""}`, children: [
        /* @__PURE__ */ jsxs("div", { className: "qibla-needle", style: { transform: `translate(-50%, -100%) rotate(${location ? qiblaBearing(location.lat, location.lng) - (heading ?? 0) : 0}deg)` }, children: [
          /* @__PURE__ */ jsx("span", {}),
          /* @__PURE__ */ jsx("i", {})
        ] }),
        /* @__PURE__ */ jsx("span", { className: "qibla-center", children: "\u{1F54B}" }),
        /* @__PURE__ */ jsx("small", { children: "N" })
      ] }),
      location && /* @__PURE__ */ jsxs("p", { className: "qibla-bearing", children: [
        qiblaBearing(location.lat, location.lng).toFixed(1),
        "\xB0 from north",
        qiblaAligned ? " \xB7 aligned" : ""
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "islamic-primary", onClick: requestQibla, children: [
        /* @__PURE__ */ jsx(Compass, { size: 16 }),
        " Enable compass"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "islamic-note", children: "Move the phone in a figure of 8 to calibrate. A live compass needs a compatible phone." })
    ] }) }),
    dataReady && section === "Calendar" && /* @__PURE__ */ jsx("div", { className: "islamic-columns", children: /* @__PURE__ */ jsxs("article", { className: "islamic-card calendar-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "calendar-heading", children: [
        /* @__PURE__ */ jsx("button", { "aria-label": "Previous month", onClick: () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)), children: /* @__PURE__ */ jsx(ArrowLeft, { size: 17 }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "islamic-overline", children: "HIJRI CALENDAR" }),
          /* @__PURE__ */ jsx("h2", { children: calendarMonth.toLocaleDateString(void 0, { month: "long", year: "numeric" }) })
        ] }),
        /* @__PURE__ */ jsx("button", { "aria-label": "Next month", onClick: () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)), children: /* @__PURE__ */ jsx(ArrowRight, { size: 17 }) }),
        /* @__PURE__ */ jsx("button", { onClick: () => setCalendarMonth(new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1)), children: "Today" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "calendar-grid", children: [
        ["M", "T", "W", "T", "F", "S", "S"].map((day, index) => /* @__PURE__ */ jsx("strong", { children: day }, `${day}-${index}`)),
        Array.from({ length: 42 }, (_, index) => {
          const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
          const offset = (first.getDay() + 6) % 7;
          const date = new Date(first.getFullYear(), first.getMonth(), index - offset + 1);
          const sameMonth = date.getMonth() === calendarMonth.getMonth();
          const hijri = parts(date, "islamic-umalqura");
          const hijriDay = hijri.day;
          const event = importantDays.find((item) => item.month === Number(hijri.month) && item.day === Number(hijri.day));
          return /* @__PURE__ */ jsxs("div", { title: event?.label, className: `calendar-cell ${sameMonth ? "" : "outside"} ${date.getDay() === 5 ? "friday" : ""} ${todayKey(date, timezone) === today ? "calendar-today" : ""} ${event ? "calendar-event" : ""}`, children: [
            /* @__PURE__ */ jsx("span", { children: date.getDate() }),
            /* @__PURE__ */ jsx("small", { children: hijriDay }),
            event && /* @__PURE__ */ jsx("i", {})
          ] }, index);
        })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "islamic-note", children: "Hijri dates and commonly observed days can vary by local moon sighting." }),
      /* @__PURE__ */ jsxs("div", { className: "calendar-observances", children: [
        /* @__PURE__ */ jsx("strong", { children: "Commonly observed days" }),
        importantDays.map(({ month, day, label }, index) => /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsxs("i", { children: [
            month,
            "/",
            day
          ] }),
          label
        ] }, `${month}-${day}-${index}`))
      ] })
    ] }) })
  ] });
}
export {
  IslamicSection,
  qiblaBearing
};
