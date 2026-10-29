export const categories = [
  { id: "groceries", label: "סופר", icon: "ShoppingBasket", color: "#117d69" },
  { id: "dates", label: "דייטים", icon: "Heart", color: "#c65976" },
  { id: "travel", label: "טיולים", icon: "Plane", color: "#527bd6" },
  { id: "transport", label: "נסיעות", icon: "Car", color: "#ad781e" },
  { id: "home", label: "בית", icon: "House", color: "#8570b4" },
  { id: "food", label: "אוכל בחוץ", icon: "Utensils", color: "#cc7053" },
  { id: "health", label: "בריאות", icon: "Activity", color: "#288f9b" },
  { id: "shopping", label: "קניות", icon: "ShoppingBag", color: "#a35b98" },
  { id: "other", label: "אחר", icon: "Ellipsis", color: "#6f7a7b" },
];

export const money = (agorot) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: agorot % 100 ? 2 : 0,
  }).format(agorot / 100);

export function parseAmount(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value)))
    throw new Error("יש להזין סכום חיובי עם עד שתי ספרות אחרי הנקודה");
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10000000000)
    throw new Error("הסכום אינו תקין");
  return amount;
}

export function validateTransaction(transaction) {
  if (
    !transaction ||
    !["expense", "income", "transfer"].includes(transaction.type)
  )
    throw new Error("סוג תנועה אינו תקין");
  if (!["a", "b"].includes(transaction.person)) throw new Error("יש לבחור אדם");
  if (
    !Number.isSafeInteger(transaction.amount) ||
    transaction.amount <= 0 ||
    transaction.amount > 10000000000
  )
    throw new Error("הסכום אינו תקין");
  if (
    !Number.isInteger(transaction.shareA) ||
    transaction.shareA < 0 ||
    transaction.shareA > 100
  )
    throw new Error("החלוקה אינה תקינה");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date) ||
    new Date(`${transaction.date}T12:00:00Z`).toISOString().slice(0, 10) !==
      transaction.date
  )
    throw new Error("התאריך אינו תקין");
  if (
    typeof transaction.title !== "string" ||
    !transaction.title.trim() ||
    transaction.title.length > 120
  )
    throw new Error("יש להזין תיאור של עד 120 תווים");
  if (!categories.some((category) => category.id === transaction.category))
    throw new Error("הקטגוריה אינה תקינה");
  if (
    typeof transaction.id !== "string" ||
    !transaction.id ||
    transaction.id.length > 100
  )
    throw new Error("מזהה תנועה אינו תקין");
  return transaction;
}

export function summarize(transactions, month) {
  const selected = transactions.filter((transaction) =>
    transaction.date.startsWith(month),
  );
  const income = selected
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = selected.filter(
    (transaction) => transaction.type === "expense",
  );
  const spending = expenses.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const byCategory = categories
    .map((category) => ({
      ...category,
      amount: expenses
        .filter((transaction) => transaction.category === category.id)
        .reduce((total, transaction) => total + transaction.amount, 0),
    }))
    .filter((category) => category.amount > 0)
    .sort((first, second) => second.amount - first.amount);
  const people = ["a", "b"].map((person) => ({
    person,
    income: selected
      .filter(
        (transaction) =>
          transaction.type === "income" && transaction.person === person,
      )
      .reduce((total, transaction) => total + transaction.amount, 0),
    spending: expenses.reduce((total, transaction) => {
      const shareA = Math.round(
        (transaction.amount * transaction.shareA) / 100,
      );
      return total + (person === "a" ? shareA : transaction.amount - shareA);
    }, 0),
  }));
  let balance = 0;
  for (const transaction of transactions) {
    if (transaction.type === "expense") {
      balance +=
        (transaction.person === "a" ? transaction.amount : 0) -
        Math.round((transaction.amount * transaction.shareA) / 100);
    } else if (transaction.type === "transfer") {
      balance +=
        transaction.person === "a" ? transaction.amount : -transaction.amount;
    }
  }
  return {
    income,
    spending,
    remaining: income - spending,
    byCategory,
    people,
    balance,
    selected,
  };
}

export function applyEvents(rows) {
  const records = new Map();
  for (const row of rows) {
    if (!row[0]) continue;
    const [eventId, recordId, action, , payload] = row;
    if (!eventId || !recordId) throw new Error("נמצאה רשומה לא תקינה בגיליון");
    if (action === "delete") records.delete(recordId);
    else if (action === "save") {
      const transaction = validateTransaction(JSON.parse(payload));
      if (transaction.id !== recordId) throw new Error("מזהה רשומה אינו תואם");
      records.set(recordId, transaction);
    } else throw new Error("סוג רשומה לא מוכר בגיליון");
  }
  return [...records.values()];
}

export function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function demoTransactions() {
  const month = localDate().slice(0, 7);
  return [
    {
      id: "demo-1",
      type: "income",
      date: `${month}-01`,
      title: "משכורת",
      amount: 1400000,
      person: "a",
      shareA: 100,
      category: "other",
    },
    {
      id: "demo-2",
      type: "income",
      date: `${month}-01`,
      title: "משכורת",
      amount: 1150000,
      person: "b",
      shareA: 0,
      category: "other",
    },
    {
      id: "demo-3",
      type: "expense",
      date: `${month}-03`,
      title: "שכר דירה",
      amount: 620000,
      person: "a",
      shareA: 50,
      category: "home",
    },
    {
      id: "demo-4",
      type: "expense",
      date: `${month}-08`,
      title: "קניות לשבוע",
      amount: 48790,
      person: "b",
      shareA: 50,
      category: "groceries",
    },
    {
      id: "demo-5",
      type: "expense",
      date: `${month}-12`,
      title: "ערב של שנינו",
      amount: 28600,
      person: "a",
      shareA: 50,
      category: "dates",
    },
    {
      id: "demo-6",
      type: "expense",
      date: `${month}-15`,
      title: "דלק",
      amount: 24000,
      person: "b",
      shareA: 50,
      category: "transport",
    },
    {
      id: "demo-7",
      type: "expense",
      date: `${month}-19`,
      title: "סוף שבוע בצפון",
      amount: 164000,
      person: "a",
      shareA: 50,
      category: "travel",
    },
    {
      id: "demo-8",
      type: "expense",
      date: `${month}-21`,
      title: "קפה ומאפה",
      amount: 6800,
      person: "b",
      shareA: 50,
      category: "food",
    },
    {
      id: "demo-9",
      type: "expense",
      date: `${month}-23`,
      title: "נעליים חדשות",
      amount: 34900,
      person: "b",
      shareA: 0,
      category: "shopping",
    },
  ];
}
