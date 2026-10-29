import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, summarize } from "./finance";

export default function TrendChart({ transactions, month }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const chartData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, monthNumber - 6 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const result = summarize(transactions, key);
    return {
      name: new Intl.DateTimeFormat("he-IL", { month: "short" }).format(date),
      income: result.income / 100,
      expenses: result.spending / 100,
    };
  });
  return (
    <section className="trend-section">
      <div className="section-heading">
        <h2>התמונה לאורך זמן</h2>
        <div className="chart-key">
          <span>
            <i className="income-dot" />
            הכנסות
          </span>
          <span>
            <i className="expense-dot" />
            הוצאות
          </span>
        </div>
      </div>
      <div
        className="trend-chart"
        dir="ltr"
        role="img"
        aria-label="השוואת הכנסות והוצאות בששת החודשים האחרונים"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            barGap={5}
            margin={{ left: 0, right: 0, top: 16, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="#e9eeeb"
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#78817c", fontFamily: "Heebo" }}
            />
            <YAxis
              width={48}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#78817c" }}
              tickFormatter={(value) =>
                value >= 1000 ? `${value / 1000}k` : value
              }
            />
            <Tooltip
              formatter={(value, name) => [
                money(Number(value) * 100),
                name === "income" ? "הכנסות" : "הוצאות",
              ]}
              contentStyle={{
                direction: "rtl",
                border: "1px solid #e4e9e5",
                borderRadius: 6,
                fontFamily: "Heebo",
              }}
              cursor={{ fill: "#f0f5f2" }}
            />
            <Bar
              dataKey="income"
              fill="#16816b"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="expenses"
              fill="#e6b976"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
