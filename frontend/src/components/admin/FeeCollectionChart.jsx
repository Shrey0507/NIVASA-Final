import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const moneyTrend = [
  { month: "Aug", collected: 980000, billed: 1120000 },
  { month: "Sep", collected: 1040000, billed: 1180000 },
  { month: "Oct", collected: 1160000, billed: 1240000 },
  { month: "Nov", collected: 1010000, billed: 1210000 },
  { month: "Dec", collected: 1280000, billed: 1350000 },
  { month: "Jan", collected: 1195000, billed: 1290000 },
];

const moneyChartConfig = {
  collected: { label: "Collected", color: "var(--chart-1)" },
  billed: { label: "Billed", color: "var(--chart-2)" },
};

/**
 * Fee collection trend. Split into its own module so recharts is loaded in a
 * separate chunk instead of blocking the dashboard's first paint.
 */
export default function FeeCollectionChart() {
  return (
    <ChartContainer config={moneyChartConfig} className="h-64 w-full">
      <AreaChart data={moneyTrend} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillCollected" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-collected)"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="var(--color-collected)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => `${v / 100000}L`}
        />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => inr(value)} />} />
        <Area
          dataKey="billed"
          type="monotone"
          stroke="var(--color-billed)"
          strokeDasharray="4 4"
          fill="none"
          strokeWidth={2}
        />
        <Area
          dataKey="collected"
          type="monotone"
          stroke="var(--color-collected)"
          fill="url(#fillCollected)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
