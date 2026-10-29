import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Ellipsis,
  Heart,
  House,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Trash2,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import {
  categories,
  demoTransactions,
  localDate,
  money,
  parseAmount,
  summarize,
  validateTransaction,
} from "./finance";
import {
  appendChange,
  authorize,
  connectSheet,
  disconnectGoogle,
  readSheet,
} from "./google";
import "./chopi.css";

const icons = {
  Activity,
  Car,
  Ellipsis,
  Heart,
  House,
  Plane,
  ShoppingBag,
  ShoppingBasket,
  Utensils,
};
const LazyTrendChart = lazy(() => import("./TrendChart.jsx"));
const initialConfig = {
  nameA: "אני",
  nameB: "בת הזוג",
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  sheetId: import.meta.env.VITE_GOOGLE_SHEET_ID || "",
};
const navItems = [
  { id: "overview", label: "מבט משותף", icon: LayoutDashboard },
  { id: "activity", label: "התנועות שלנו", icon: ArrowLeftRight },
  { id: "insights", label: "לאן הכסף הולך", icon: BarChart3 },
];

function readConfig() {
  try {
    return {
      ...initialConfig,
      ...JSON.parse(localStorage.getItem("chopi-config") || "{}"),
    };
  } catch {
    return initialConfig;
  }
}

function readDemo() {
  try {
    const stored = JSON.parse(localStorage.getItem("chopi-demo") || "null");
    if (stored) return stored.map(validateTransaction);
  } catch {
    return demoTransactions();
  }
  return demoTransactions();
}

function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={19} aria-hidden="true" />
    </button>
  );
}

function CategoryIcon({ category, type }) {
  const Icon =
    type === "income"
      ? ArrowDownLeft
      : type === "transfer"
        ? ArrowLeftRight
        : icons[category.icon];
  return (
    <span
      className="category-icon"
      style={{
        "--category-color":
          type === "income"
            ? "#117d69"
            : type === "transfer"
              ? "#527bd6"
              : category.color,
      }}
    >
      <Icon size={19} />
    </span>
  );
}

function TransactionForm({
  transaction,
  isExisting,
  config,
  busy,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(
    transaction || {
      id: crypto.randomUUID(),
      type: "expense",
      amount: "",
      date: localDate(),
      title: "",
      person: "a",
      category: "groceries",
      shareA: 50,
    },
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount / 100) : "",
  );
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => {
    dialogRef.current.showModal();
    const dialog = dialogRef.current;
    return () => dialog.close();
  }, []);
  function update(key, value) {
    setForm({ ...form, [key]: value });
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const value = validateTransaction({
        ...form,
        title: form.title.trim(),
        amount: parseAmount(amount),
        shareA: Number(form.shareA),
      });
      await onSave(value);
    } catch (issue) {
      setError(issue.message);
    }
  }
  return (
    <dialog
      ref={dialogRef}
      className="transaction-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="transaction-heading"
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">
            CHOPI / {isExisting ? "עריכה" : "תנועה חדשה"}
          </span>
          <h2 id="transaction-heading">
            {isExisting ? "עדכון תנועה" : "מה חדש אצלנו?"}
          </h2>
        </div>
        <IconButton icon={X} label="סגירה" onClick={onClose} disabled={busy} />
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="segmented type-switch">
            {[
              { id: "expense", text: "הוצאה" },
              { id: "income", text: "הכנסה" },
              { id: "transfer", text: "החזר בינינו" },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                aria-pressed={form.type === type.id}
                className={form.type === type.id ? "active" : ""}
                onClick={() => update("type", type.id)}
              >
                {type.text}
              </button>
            ))}
          </div>
          <label className="amount-field">
            סכום בשקלים
            <div>
              <span>₪</span>
              <input
                aria-label="סכום בשקלים"
                inputMode="decimal"
                type="number"
                min="0.01"
                max="100000000"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                autoFocus
              />
            </div>
          </label>
          <label>
            תיאור
            <input
              maxLength={120}
              placeholder={
                form.type === "income"
                  ? "למשל, משכורת"
                  : form.type === "transfer"
                    ? "למשל, סגירת חשבון בינינו"
                    : "למשל, קניות לשבוע"
              }
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              required
            />
          </label>
          <div className="form-grid">
            <label>
              תאריך
              <input
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                required
              />
            </label>
            <label>
              {form.type === "income"
                ? "מי קיבל/ה?"
                : form.type === "transfer"
                  ? "מי העביר/ה?"
                  : "מי שילם/ה?"}
              <select
                value={form.person}
                onChange={(event) => update("person", event.target.value)}
              >
                <option value="a">{config.nameA}</option>
                <option value="b">{config.nameB}</option>
              </select>
            </label>
          </div>
          {form.type === "expense" && (
            <>
              <label>
                קטגוריה
                <select
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                >
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="split-field">
                <span className="field-label">בשביל מי?</span>
                <div className="segmented">
                  {[
                    { share: 50, label: "שנינו" },
                    { share: 100, label: config.nameA },
                    { share: 0, label: config.nameB },
                  ].map((option) => (
                    <button
                      key={option.share}
                      type="button"
                      className={
                        Number(form.shareA) === option.share ? "active" : ""
                      }
                      aria-pressed={Number(form.shareA) === option.share}
                      onClick={() => update("shareA", option.share)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="split-label">
                  <span>
                    {config.nameA}: {form.shareA}%
                  </span>
                  <span>
                    {config.nameB}: {100 - form.shareA}%
                  </span>
                </div>
                <input
                  aria-label={`החלק של ${config.nameA} באחוזים`}
                  type="range"
                  min="0"
                  max="100"
                  value={form.shareA}
                  onChange={(event) =>
                    update("shareA", Number(event.target.value))
                  }
                />
              </div>
            </>
          )}
          {form.type === "transfer" && (
            <p className="subtle">
              העברה אל {form.person === "a" ? config.nameB : config.nameA}.
              ההחזר מקטין את החוב, ואינו נחשב הכנסה או הוצאה.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="primary-button" type="submit">
              <Check size={18} />
              {busy ? "שומר..." : "שמירת תנועה"}
            </button>
            {isExisting && (
              <button
                className="danger-button"
                type="button"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={17} />
                מחיקה
              </button>
            )}
          </div>
          {confirmDelete && (
            <div className="delete-confirm">
              <span>למחוק את התנועה?</span>
              <button
                type="button"
                className="danger-button"
                onClick={async () => {
                  try {
                    await onDelete(transaction);
                  } catch (issue) {
                    setError(issue.message);
                  }
                }}
              >
                כן, למחוק
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setConfirmDelete(false)}
              >
                ביטול
              </button>
            </div>
          )}
        </fieldset>
      </form>
    </dialog>
  );
}

function CategoryBreakdown({ summary }) {
  const [selected, setSelected] = useState(null);
  const slices = summary.byCategory.map((category, index) => {
    const start =
      (summary.byCategory
        .slice(0, index)
        .reduce((total, item) => total + item.amount, 0) /
        summary.spending) *
      100;
    const end = start + (category.amount / summary.spending) * 100;
    return `${category.color} ${start}% ${end}%`;
  });
  const current = summary.byCategory.find(
    (category) => category.id === selected,
  );
  return (
    <section className="breakdown-section">
      <div className="section-heading">
        <h2>לאן הכסף הולך?</h2>
        <span className="subtle">הוצאות לפי קטגוריה</span>
      </div>
      {summary.spending ? (
        <div className="breakdown-content">
          <div
            className="donut"
            role="img"
            aria-label={`סך ההוצאות ${money(summary.spending)}`}
            style={{ background: `conic-gradient(${slices.join(",")})` }}
          >
            <div>
              <span>{current ? current.label : "סך ההוצאות"}</span>
              <strong dir="ltr">
                {money(current ? current.amount : summary.spending)}
              </strong>
            </div>
          </div>
          <div className="category-legend">
            {summary.byCategory.map((category) => (
              <button
                key={category.id}
                type="button"
                className={selected === category.id ? "selected" : ""}
                onClick={() =>
                  setSelected(selected === category.id ? null : category.id)
                }
              >
                <span
                  className="legend-dot"
                  style={{ background: category.color }}
                />
                <span>{category.label}</span>
                <strong dir="ltr">{money(category.amount)}</strong>
                <small>
                  {Math.round((category.amount / summary.spending) * 100)}%
                </small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-inline">
          <ShoppingBasket size={30} />
          <p>עדיין אין הוצאות בחודש הזה</p>
        </div>
      )}
    </section>
  );
}

function TrendChart(props) {
  return (
    <Suspense
      fallback={
        <div className="trend-chart empty-inline" role="status">
          טוען נתונים...
        </div>
      }
    >
      <LazyTrendChart {...props} />
    </Suspense>
  );
}

function TransactionList({
  transactions,
  config,
  onEdit,
  busy,
  compact = false,
}) {
  if (!transactions.length)
    return (
      <div className="empty-inline">
        <ArrowLeftRight size={30} />
        <p>אין תנועות להצגה</p>
      </div>
    );
  return (
    <div className="transaction-list">
      {transactions.slice(0, compact ? 5 : undefined).map((transaction) => {
        const category = categories.find(
          (item) => item.id === transaction.category,
        );
        const name = transaction.person === "a" ? config.nameA : config.nameB;
        const allocation =
          transaction.type === "income"
            ? "הכנסה"
            : transaction.type === "transfer"
              ? "החזר בינינו"
              : transaction.shareA === 50
                ? "משותף"
                : transaction.shareA === 100
                  ? config.nameA
                  : transaction.shareA === 0
                    ? config.nameB
                    : `חלוקה ${transaction.shareA}/${100 - transaction.shareA}`;
        return (
          <button
            type="button"
            className="transaction-row"
            key={transaction.id}
            onClick={() => onEdit(transaction)}
            disabled={busy}
            aria-label={`עריכת ${transaction.title}`}
          >
            <CategoryIcon category={category} type={transaction.type} />
            <span className="transaction-info">
              <strong>{transaction.title}</strong>
              <span>
                {name}
                <i />
                {transaction.type === "expense" ? category.label : allocation}
                <span className="row-date">
                  {" "}
                  ·{" "}
                  {new Intl.DateTimeFormat("he-IL", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(`${transaction.date}T12:00:00`))}
                </span>
              </span>
            </span>
            <span className={`allocation-badge ${transaction.type}`}>
              {allocation}
            </span>
            <span
              className={`transaction-amount ${transaction.type}`}
              dir="ltr"
            >
              {transaction.type === "income"
                ? "+"
                : transaction.type === "expense"
                  ? "−"
                  : ""}
              {money(transaction.amount)}
            </span>
            <ChevronLeft size={16} className="row-chevron" />
          </button>
        );
      })}
    </div>
  );
}

function downloadData(transactions, names) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          currency: "ILS",
          amountUnit: "agorot",
          people: names,
          transactions,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `chopi-${localDate()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [config, setConfig] = useState(readConfig);
  const [draftConfig, setDraftConfig] = useState(config);
  const [transactions, setTransactions] = useState(readDemo);
  const [mode, setMode] = useState("demo");
  const [view, setView] = useState("overview");
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [lastSync, setLastSync] = useState(null);
  const lock = useRef(false);
  const summary = summarize(transactions, month);
  const names = { a: config.nameA, b: config.nameB };
  const sorted = [...summary.selected].sort((first, second) =>
    second.date.localeCompare(first.date),
  );
  const filtered = sorted.filter(
    (transaction) =>
      (!search || transaction.title.includes(search)) &&
      (personFilter === "all" || transaction.person === personFilter) &&
      (categoryFilter === "all" || transaction.category === categoryFilter) &&
      (typeFilter === "all" || transaction.type === typeFilter),
  );
  const savingRate = summary.income
    ? Math.round((summary.remaining / summary.income) * 100)
    : null;

  async function refresh() {
    if (mode !== "google" || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      setTransactions(await readSheet(config.sheetId));
      setLastSync(new Date());
      setMessage(null);
    } catch (issue) {
      setMessage({ error: true, text: issue.message });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const onFocus = useEffectEvent(() => {
    void refresh();
  });
  useEffect(() => {
    const handler = () => onFocus();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

  async function mutate(transaction, action) {
    if (lock.current) throw new Error("פעולה קודמת עדיין מתבצעת");
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const next = [
        ...transactions.filter((item) => item.id !== transaction.id),
        ...(action === "save" ? [transaction] : []),
      ];
      if (mode === "google")
        await appendChange(config.sheetId, transaction, action);
      else localStorage.setItem("chopi-demo", JSON.stringify(next));
      setTransactions(next);
      setEditor(null);
      setMessage({ text: action === "save" ? "התנועה נשמרה" : "התנועה נמחקה" });
      if (mode === "google") {
        try {
          setTransactions(await readSheet(config.sheetId));
          setLastSync(new Date());
        } catch {
          setMessage({
            error: true,
            text: "השינוי נשמר ב-Google, אך הרענון נכשל. יש לרענן לפני עריכה נוספת.",
          });
        }
      }
    } catch (issue) {
      throw new Error(
        mode === "google"
          ? `${issue.message}. אם החיבור נותק בזמן השמירה, יש לרענן לפני ניסיון נוסף.`
          : "לא ניתן לשמור במכשיר. יש לבדוק שאחסון הדפדפן זמין.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function saveSettings(event) {
    event.preventDefault();
    const next = {
      ...draftConfig,
      nameA: draftConfig.nameA.trim(),
      nameB: draftConfig.nameB.trim(),
      clientId: draftConfig.clientId.trim(),
      sheetId: draftConfig.sheetId.trim(),
    };
    if (!next.nameA || !next.nameB || next.nameA === next.nameB)
      return setMessage({ error: true, text: "יש להזין שני שמות שונים" });
    try {
      localStorage.setItem("chopi-config", JSON.stringify(next));
      if (
        mode === "google" &&
        (next.sheetId !== config.sheetId || next.clientId !== config.clientId)
      ) {
        disconnectGoogle();
        setMode("demo");
        setTransactions(readDemo());
        setLastSync(null);
      }
      setConfig(next);
      setDraftConfig(next);
      setMessage({ text: "ההגדרות נשמרו במכשיר הזה" });
    } catch {
      setMessage({ error: true, text: "לא ניתן לשמור את ההגדרות בדפדפן" });
    }
  }

  async function connect() {
    if (lock.current) return;
    if (
      !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(config.clientId) ||
      !/^[\w-]{15,}$/.test(config.sheetId)
    )
      return setMessage({
        error: true,
        text: "יש לשמור מזהה לקוח Google ומזהה גיליון תקינים לפני ההתחברות",
      });
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await authorize(config.clientId);
      const live = await connectSheet(config.sheetId);
      setTransactions(live);
      setMode("google");
      setLastSync(new Date());
      setView("overview");
      setMessage({
        text: "מחוברים לגיליון שלכם. נתוני הדוגמה לא הועתקו אליו.",
      });
    } catch (issue) {
      disconnectGoogle();
      setMode("demo");
      setTransactions(readDemo());
      setLastSync(null);
      setMessage({ error: true, text: issue.message });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function moveMonth(amount) {
    const [year, number] = month.split("-").map(Number);
    const date = new Date(year, number - 1 + amount, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  function openSettings() {
    setDraftConfig(config);
    setView("settings");
  }
  function exportData() {
    downloadData(transactions, names);
  }

  return (
    <div className="app-shell" dir="rtl">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            setView("overview");
          }}
        >
          <span className="brand-mark">
            <Wallet size={23} strokeWidth={1.8} />
          </span>
          <span dir="ltr">
            Chopi<span className="brand-period">.</span>
          </span>
        </a>
        <span className="sidebar-caption">הכסף שלנו, ביחד.</span>
        <nav aria-label="ניווט ראשי">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={view === id ? "nav-item active" : "nav-item"}
              onClick={() => setView(id)}
            >
              <Icon size={20} />
              {label}
              {view === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="couple-avatars">
            <span>{config.nameA.slice(0, 1)}</span>
            <span>{config.nameB.slice(0, 1)}</span>
          </div>
          <strong>
            {config.nameA} ו{config.nameB}
          </strong>
          <span className="subtle">המרחב המשותף שלנו</span>
          <button
            type="button"
            className={view === "settings" ? "nav-item active" : "nav-item"}
            disabled={busy}
            onClick={openSettings}
          >
            <Settings size={19} />
            הגדרות וחיבור
          </button>
          <span className="privacy-note">
            <ShieldCheck size={14} />
            {mode === "google"
              ? "הגישה לפי הרשאות הגיליון"
              : "תצוגה מקומית בלבד"}
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand" dir="ltr">
            Chopi<span>.</span>
          </div>
          <div className="desktop-breadcrumb">
            המרחב שלנו <ChevronLeft size={14} />
            <strong>
              {navItems.find((item) => item.id === view)?.label || "הגדרות"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className={`connection-status ${mode}`}>
              <i />
              {mode === "google" ? "Google Sheets" : "מצב דוגמה"}
            </span>
            <IconButton
              icon={RefreshCw}
              label="רענון מהגיליון"
              disabled={mode !== "google" || busy}
              onClick={refresh}
              className={`icon-button ${busy ? "spinning" : ""}`}
            />
            <IconButton
              icon={Settings}
              label="הגדרות"
              onClick={openSettings}
              disabled={busy}
            />
          </div>
        </header>
        <main>
          {mode === "demo" && (
            <div className="demo-notice">
              <span>
                <CircleHelp size={16} />
                <strong>מצב דוגמה</strong>
                <span>הנתונים נשמרים רק בדפדפן הזה, ולא משותפים.</span>
              </span>
              <button type="button" onClick={openSettings} disabled={busy}>
                חיבור לגיליון <ChevronLeft size={15} />
              </button>
            </div>
          )}
          {message && (
            <div
              className={`notice ${message.error ? "error" : "success"}`}
              role={message.error ? "alert" : "status"}
            >
              <span>{message.text}</span>
              <IconButton
                icon={X}
                label="סגירת הודעה"
                onClick={() => setMessage(null)}
              />
            </div>
          )}
          {view !== "settings" && (
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {view === "overview"
                    ? "קצת סדר. יותר שקט."
                    : view === "activity"
                      ? "כל הפרטים הקטנים"
                      : "מסתכלים על התמונה הגדולה"}
                </p>
                <h1>
                  {view === "overview"
                    ? "החודש שלנו"
                    : view === "activity"
                      ? "התנועות שלנו"
                      : "לאן הכסף הולך"}
                </h1>
              </div>
              <div className="heading-actions">
                <div className="month-picker">
                  <IconButton
                    icon={ChevronRight}
                    label="החודש הקודם"
                    onClick={() => moveMonth(-1)}
                  />
                  <label className="month-label">
                    <span>
                      {new Intl.DateTimeFormat("he-IL", {
                        month: "long",
                        year: "numeric",
                      }).format(new Date(`${month}-01T12:00:00`))}
                    </span>
                    <input
                      type="month"
                      aria-label="בחירת חודש"
                      value={month}
                      onChange={(event) => {
                        if (/^\d{4}-\d{2}$/.test(event.target.value))
                          setMonth(event.target.value);
                      }}
                    />
                  </label>
                  <IconButton
                    icon={ChevronLeft}
                    label="החודש הבא"
                    onClick={() => moveMonth(1)}
                  />
                </div>
                <button
                  className="primary-button desktop-add"
                  type="button"
                  disabled={busy}
                  onClick={() => setEditor({})}
                >
                  <Plus size={19} />
                  תנועה חדשה
                </button>
              </div>
            </div>
          )}

          {view === "overview" && (
            <>
              <section className="metrics" aria-label="סיכום חודשי">
                <div className="metric">
                  <div className="metric-label">
                    <span>הכנסות</span>
                    <span className="metric-icon income">
                      <ArrowDownLeft size={20} />
                    </span>
                  </div>
                  <strong dir="ltr">{money(summary.income)}</strong>
                  <span className="metric-foot">מה שנכנס, לשנינו</span>
                </div>
                <div className="metric">
                  <div className="metric-label">
                    <span>הוצאות</span>
                    <span className="metric-icon expense">
                      <ArrowUpRight size={20} />
                    </span>
                  </div>
                  <strong dir="ltr">{money(summary.spending)}</strong>
                  <span className="metric-foot">משותפות ואישיות</span>
                </div>
                <div className="metric remaining">
                  <div className="metric-label">
                    <span>נשאר לנו החודש</span>
                    <Wallet size={20} />
                  </div>
                  <strong dir="ltr">{money(summary.remaining)}</strong>
                  <span className="metric-foot">
                    {savingRate === null
                      ? "הכנסות פחות הוצאות"
                      : `${savingRate}% מההכנסות נשארו אצלנו`}
                  </span>
                </div>
              </section>
              <div className="dashboard-grid">
                <CategoryBreakdown summary={summary} />
                <section className="together-section">
                  <div className="section-heading">
                    <h2>כל אחד, וביחד</h2>
                    <Heart size={18} />
                  </div>
                  <div className="people-summary">
                    {summary.people.map((person) => (
                      <div key={person.person} className="person-summary">
                        <span
                          className={`person-avatar person-${person.person}`}
                        >
                          {names[person.person].slice(0, 1)}
                        </span>
                        <div>
                          <strong>{names[person.person]}</strong>
                          <span>
                            הכנסות <b dir="ltr">{money(person.income)}</b>
                          </span>
                          <span>
                            חלק בהוצאות{" "}
                            <b dir="ltr">{money(person.spending)}</b>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="balance-line">
                    <span className="balance-symbol">
                      <ArrowLeftRight size={20} />
                    </span>
                    <div>
                      <span className="subtle">האיזון בינינו · כל הזמנים</span>
                      <strong>
                        {summary.balance === 0 ? (
                          "אנחנו מאוזנים"
                        ) : (
                          <>
                            {summary.balance > 0 ? config.nameB : config.nameA}{" "}
                            חייב/ת ל
                            {summary.balance > 0 ? config.nameA : config.nameB}
                            <b dir="ltr">{money(Math.abs(summary.balance))}</b>
                          </>
                        )}
                      </strong>
                    </div>
                    {summary.balance !== 0 && (
                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          setEditor({
                            transaction: {
                              id: crypto.randomUUID(),
                              type: "transfer",
                              title: "החזר בינינו",
                              date: localDate(),
                              amount: Math.abs(summary.balance),
                              person: summary.balance > 0 ? "b" : "a",
                              shareA: 50,
                              category: "other",
                            },
                          })
                        }
                      >
                        החזר
                      </button>
                    )}
                  </div>
                  <div className="shared-moment">
                    <img
                      src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=700&q=80"
                      alt="אגם והרים באור יום"
                      loading="lazy"
                    />
                    <span>יותר מקום לרגעים שלנו.</span>
                  </div>
                </section>
              </div>
              <section className="recent-section">
                <div className="section-heading">
                  <h2>התנועות האחרונות</h2>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setView("activity")}
                  >
                    כל התנועות <ChevronLeft size={16} />
                  </button>
                </div>
                <TransactionList
                  transactions={sorted}
                  config={config}
                  busy={busy}
                  compact
                  onEdit={(transaction) => setEditor({ transaction })}
                />
              </section>
            </>
          )}

          {view === "activity" && (
            <section className="activity-section">
              <div className="filters">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="חיפוש תנועה"
                    placeholder="חיפוש תנועה..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <div className="filter-selects">
                  <ListFilter size={17} />
                  <select
                    aria-label="סינון לפי משלם או מקבל"
                    value={personFilter}
                    onChange={(event) => setPersonFilter(event.target.value)}
                  >
                    <option value="all">שנינו</option>
                    <option value="a">{config.nameA}</option>
                    <option value="b">{config.nameB}</option>
                  </select>
                  <select
                    aria-label="סינון לפי סוג"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                  >
                    <option value="all">כל הסוגים</option>
                    <option value="expense">הוצאות</option>
                    <option value="income">הכנסות</option>
                    <option value="transfer">החזרים</option>
                  </select>
                  <select
                    aria-label="סינון לפי קטגוריה"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="all">כל הקטגוריות</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="list-caption">
                <span>{filtered.length} תנועות</span>
                <span>לפי תאריך, מהחדש לישן</span>
              </div>
              <TransactionList
                transactions={filtered}
                config={config}
                busy={busy}
                onEdit={(transaction) => setEditor({ transaction })}
              />
            </section>
          )}

          {view === "insights" && (
            <>
              <TrendChart transactions={transactions} month={month} />
              <div className="insights-grid">
                <CategoryBreakdown summary={summary} />
                <section className="category-totals">
                  <div className="section-heading">
                    <h2>במספרים</h2>
                    <span className="subtle">החודש הנבחר</span>
                  </div>
                  <dl>
                    <div>
                      <dt>הוצאות משותפות וחלוקות</dt>
                      <dd dir="ltr">
                        {money(
                          summary.selected
                            .filter(
                              (transaction) =>
                                transaction.type === "expense" &&
                                transaction.shareA > 0 &&
                                transaction.shareA < 100,
                            )
                            .reduce(
                              (total, transaction) =>
                                total + transaction.amount,
                              0,
                            ),
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>הוצאות אישיות</dt>
                      <dd dir="ltr">
                        {money(
                          summary.selected
                            .filter(
                              (transaction) =>
                                transaction.type === "expense" &&
                                [0, 100].includes(transaction.shareA),
                            )
                            .reduce(
                              (total, transaction) =>
                                total + transaction.amount,
                              0,
                            ),
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>ממוצע לתנועת הוצאה</dt>
                      <dd dir="ltr">
                        {money(
                          summary.spending
                            ? Math.round(
                                summary.spending /
                                  summary.selected.filter(
                                    (transaction) =>
                                      transaction.type === "expense",
                                  ).length,
                              )
                            : 0,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>הכנסות פחות הוצאות</dt>
                      <dd dir="ltr">{money(summary.remaining)}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </>
          )}

          {view === "settings" && (
            <div className="settings-page">
              <div className="page-heading">
                <div>
                  <p className="eyebrow">המרחב שלנו</p>
                  <h1>הגדרות וחיבור</h1>
                </div>
              </div>
              <form className="settings-form" onSubmit={saveSettings}>
                <fieldset disabled={busy}>
                  <section>
                    <h2>מי אנחנו?</h2>
                    <div className="form-grid">
                      <label>
                        שם ראשון
                        <input
                          value={draftConfig.nameA}
                          maxLength={25}
                          onChange={(event) =>
                            setDraftConfig({
                              ...draftConfig,
                              nameA: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                      <label>
                        שם שני
                        <input
                          value={draftConfig.nameB}
                          maxLength={25}
                          onChange={(event) =>
                            setDraftConfig({
                              ...draftConfig,
                              nameB: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                    </div>
                  </section>
                  <section>
                    <div className="section-heading">
                      <h2>Google Sheets</h2>
                      <ShieldCheck size={20} />
                    </div>
                    <label>
                      מזהה לקוח Google (Client ID)
                      <input
                        dir="ltr"
                        placeholder="…apps.googleusercontent.com"
                        value={draftConfig.clientId}
                        onChange={(event) =>
                          setDraftConfig({
                            ...draftConfig,
                            clientId: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      מזהה הגיליון (Spreadsheet ID)
                      <input
                        dir="ltr"
                        placeholder="המזהה מתוך כתובת הגיליון"
                        value={draftConfig.sheetId}
                        onChange={(event) =>
                          setDraftConfig({
                            ...draftConfig,
                            sheetId: event.target.value,
                          })
                        }
                      />
                    </label>
                    <p className="subtle">
                      יש לשתף את הגיליון רק עם שני חשבונות Google שלכם, בהרשאת
                      עריכה. ההגדרות והשמות נשמרים בכל מכשיר בנפרד.
                    </p>
                    <details className="setup-help">
                      <summary>הגדרת החיבור הראשוני</summary>
                      <ol>
                        <li>
                          יוצרים גיליון Google חדש. בשיתוף בוחרים ״גישה מוגבלת״
                          ומוסיפים רק את החשבון השני כעורך.
                        </li>
                        <li>
                          ב-Google Cloud יוצרים פרויקט ומפעילים Google Sheets
                          API.
                        </li>
                        <li>
                          ב-Google Auth Platform מגדירים אפליקציה חיצונית במצב
                          בדיקה ומוסיפים את שני החשבונות כמשתמשי בדיקה.
                        </li>
                        <li>
                          יוצרים OAuth Client מסוג Web application ומוסיפים
                          ל-Authorized JavaScript origins את כתובת האתר. כרגע:{" "}
                          <bdi>{window.location.origin}</bdi>
                        </li>
                        <li>
                          מעתיקים לכאן את Client ID ואת מזהה הגיליון (החלק שבין
                          ‎/d/‎ לבין ‎/edit‎ בכתובת שלו). שומרים ואז מתחברים.
                        </li>
                      </ol>
                      <p>
                        אין להזין סיסמה או Client Secret. לאחר החיבור תיווצר
                        לשונית Chopi. אין למיין או לשנות את יומן השינויים;
                        העריכה נעשית כאן.
                      </p>
                      <p>
                        הרשאת Google המבוקשת כוללת גישה לגיליונות שבחשבון. הקוד
                        ניגש רק למזהה שהוגדר. במצב בדיקה Google עשויה לבקש אישור
                        מחדש.
                      </p>
                    </details>
                  </section>
                  <button className="primary-button" type="submit">
                    <Check size={18} />
                    שמירת הגדרות
                  </button>
                </fieldset>
              </form>
              <section className="connection-section">
                <button
                  type="button"
                  className="google-button"
                  disabled={
                    busy ||
                    JSON.stringify(draftConfig) !== JSON.stringify(config)
                  }
                  onClick={connect}
                >
                  <span className="google-letter" dir="ltr">
                    G
                  </span>
                  {busy
                    ? "מתחבר..."
                    : mode === "google"
                      ? "חיבור מחדש ל-Google"
                      : "חיבור עם Google"}
                </button>
                {mode === "google" && (
                  <>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${config.sheetId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-button"
                    >
                      פתיחת הגיליון <ArrowUpRight size={16} />
                    </a>
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        disconnectGoogle();
                        setMode("demo");
                        setTransactions(readDemo());
                        setLastSync(null);
                        setMessage({ text: "החיבור נותק במכשיר הזה" });
                      }}
                    >
                      <LogOut size={17} />
                      ניתוק
                    </button>
                  </>
                )}
              </section>
              <section className="data-section">
                <h2>הנתונים שלנו</h2>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={exportData}
                >
                  <Download size={17} />
                  ייצוא כל התנועות (JSON)
                </button>
                {mode === "demo" && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      try {
                        localStorage.setItem("chopi-demo", "[]");
                        setTransactions([]);
                        setMessage({
                          text: "הדוגמה נוקתה. אפשר להתחיל להזין תנועות מקומיות.",
                        });
                      } catch {
                        setMessage({
                          error: true,
                          text: "לא ניתן לשנות אחסון מקומי",
                        });
                      }
                    }}
                  >
                    ניקוי נתוני הדוגמה
                  </button>
                )}
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              <ShieldCheck size={13} />
              {mode === "google"
                ? "הנתונים בגיליון שלכם"
                : "נתוני דוגמה במכשיר הזה"}
            </span>
            <span>
              {lastSync
                ? `סנכרון אחרון ${lastSync.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`
                : "Chopi · ביחד זה פשוט יותר"}
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="ניווט בטלפון">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={view === id ? "active" : ""}
            onClick={() => setView(id)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className="mobile-add"
          aria-label="תנועה חדשה"
          disabled={busy}
          onClick={() => setEditor({})}
        >
          <Plus size={25} />
        </button>
      </nav>
      {editor && (
        <TransactionForm
          transaction={editor.transaction}
          isExisting={Boolean(
            editor.transaction &&
            transactions.some(
              (transaction) => transaction.id === editor.transaction.id,
            ),
          )}
          config={config}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={(transaction) => mutate(transaction, "save")}
          onDelete={(transaction) => mutate(transaction, "delete")}
        />
      )}
    </div>
  );
}

export default App;
