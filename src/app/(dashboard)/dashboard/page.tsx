'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { UiIcon } from '@/components/uiIcon';
import {
  getCategories,
  getCategoryImageUrl,
  type Category,
} from '@/services/categories';
import { useAppStore } from '@/store/useAppStore';
import CategoryFormModal from '@/components/categories/CategoryFormModal';

interface ChartPoint {
  label: string;
  inbound: number;
  outbound: number;
}

const movementDataSets: Record<'7d' | '30d' | '90d', ChartPoint[]> = {
  '7d': [
    { label: 'Mon', inbound: 45, outbound: 28 },
    { label: 'Tue', inbound: 52, outbound: 35 },
    { label: 'Wed', inbound: 68, outbound: 42 },
    { label: 'Thu', inbound: 60, outbound: 50 },
    { label: 'Fri', inbound: 85, outbound: 62 },
    { label: 'Sat', inbound: 40, outbound: 30 },
    { label: 'Sun', inbound: 32, outbound: 20 },
  ],
  '30d': [
    { label: 'W1', inbound: 210, outbound: 160 },
    { label: 'W2', inbound: 280, outbound: 210 },
    { label: 'W3', inbound: 340, outbound: 260 },
    { label: 'W4', inbound: 390, outbound: 310 },
  ],
  '90d': [
    { label: 'Month 1', inbound: 920, outbound: 740 },
    { label: 'Month 2', inbound: 1140, outbound: 890 },
    { label: 'Month 3', inbound: 1350, outbound: 1020 },
  ],
};

const toneGradients = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-cyan-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

export default function DashboardPage() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  const [greeting, setGreeting] = useState('Welcome');
  const [todayStr, setTodayStr] = useState('Workspace');

  // Quick Create Modal from Dashboard
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    setTodayStr(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date())
    );

    let active = true;
    getCategories()
      .then((items) => {
        if (active) setCategories(items);
      })
      .catch(() => {
        // silent fallback
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Chart data calculations
  const chartPoints = movementDataSets[period];
  const maxVal = Math.max(...chartPoints.map((p) => Math.max(p.inbound, p.outbound)), 100);

  const inboundPoints = chartPoints
    .map((p, idx) => {
      const x = 30 + (idx * 460) / (chartPoints.length - 1);
      const y = 150 - (p.inbound / maxVal) * 115;
      return `${x},${y}`;
    })
    .join(' ');

  const outboundPoints = chartPoints
    .map((p, idx) => {
      const x = 30 + (idx * 460) / (chartPoints.length - 1);
      const y = 150 - (p.outbound / maxVal) * 115;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome & Action Header */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {todayStr}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {greeting}
            {currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time overview of your product taxonomy, inventory levels, and stock flow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/categories"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            Manage Categories
          </Link>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-700 hover:to-teal-700 active:scale-95"
          >
            <UiIcon name="plus" size={16} />
            <span>Add Category</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Metrics */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Categories Metric */}
        <article className="card-hover-lift rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UiIcon name="layers" size={20} />
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              Live API
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Catalog Categories
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              {loading ? '…' : categories.length}
            </span>
            <span className="text-xs font-semibold text-emerald-600">Active groups</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Organizing products across active inventory
          </p>
        </article>

        {/* Total Products Metric */}
        <article className="card-hover-lift rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
              <UiIcon name="box" size={20} />
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              +14% mo/mo
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tracked Products
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              {categories.length > 0 ? categories.length * 18 + 42 : '128'}
            </span>
            <span className="text-xs font-semibold text-slate-500">SKUs tracked</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Distributed across {categories.length} categories
          </p>
        </article>

        {/* Low Stock Items */}
        <article className="card-hover-lift rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <UiIcon name="alert-triangle" size={20} />
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
              Optimal
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Low Stock Alerts
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">3</span>
            <span className="text-xs font-semibold text-amber-600">Need reorder</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            All categories above critical thresholds
          </p>
        </article>

        {/* Catalog Health */}
        <article className="card-hover-lift rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-600">
              <UiIcon name="trending-up" size={20} />
            </span>
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">
              98.2%
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Fulfillment Health
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900">$48,250</span>
            <span className="text-xs font-semibold text-teal-600">Catalog Val</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Healthy turnover & prompt replenishment
          </p>
        </article>
      </section>

      {/* Main Analytics Grid */}
      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
        {/* Interactive Stock Movement Chart */}
        <article
          id="stock-movement"
          className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Analytics
                </span>
                <span className="text-xs text-slate-400">Inbound vs Outbound</span>
              </div>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Stock Movement & Flow
              </h2>
            </div>

            {/* Range Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPeriod(r)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    period === r
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Legend & Tooltip readout */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Inbound Received
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Outbound Shipped
              </span>
            </div>
            {hoveredPoint ? (
              <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-xs animate-fade-in">
                {hoveredPoint.label}: +{hoveredPoint.inbound} in / -{hoveredPoint.outbound} out
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Hover over points to inspect</span>
            )}
          </div>

          {/* Interactive SVG Chart */}
          <div className="relative mt-4 h-56 w-full">
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 520 180"
              preserveAspectRatio="none"
              role="img"
              aria-label="Stock movement visualization"
            >
              <defs>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[35, 75, 115, 155].map((y) => (
                <line
                  key={y}
                  x1="30"
                  x2="490"
                  y1={y}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Inbound Area & Polyline */}
              <polygon
                points={`30,150 ${inboundPoints} 490,150`}
                fill="url(#emeraldGrad)"
              />
              <polyline
                points={inboundPoints}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Outbound Polyline */}
              <polyline
                points={outboundPoints}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="3 3"
              />

              {/* Data points */}
              {chartPoints.map((p, idx) => {
                const x = 30 + (idx * 460) / (chartPoints.length - 1);
                const yIn = 150 - (p.inbound / maxVal) * 115;
                const isHovered = hoveredPoint?.label === p.label;

                return (
                  <g key={idx}>
                    <circle
                      cx={x}
                      cy={yIn}
                      r={isHovered ? 6 : 4}
                      fill="white"
                      stroke="#10b981"
                      strokeWidth={isHovered ? 3 : 2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    <text
                      x={x}
                      y="172"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </article>

        {/* Inventory Stock Health / Donut Breakdown */}
        <article
          id="inventory"
          className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                Health
              </span>
              <h2 className="mt-1 text-base font-bold text-slate-900">Inventory Status</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600">Stable</span>
          </div>

          {/* Donut graphic & center stats */}
          <div className="my-auto flex items-center justify-center gap-6 py-6">
            <div className="relative grid h-32 w-32 place-items-center">
              <div
                className="h-32 w-32 rounded-full"
                style={{
                  background:
                    'conic-gradient(#10b981 0deg 260deg, #f59e0b 260deg 325deg, #ef4444 325deg 360deg)',
                }}
              />
              <div className="absolute grid h-24 w-24 place-items-center rounded-full bg-white shadow-xs">
                <div className="text-center">
                  <span className="block text-xl font-black text-slate-900">92%</span>
                  <span className="block text-[9px] font-semibold text-slate-400">In Stock</span>
                </div>
              </div>
            </div>

            {/* Legend with progress indicators */}
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-600">Healthy Stock</span>
                <span className="ml-auto font-bold text-slate-900">84%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-slate-600">Low Threshold</span>
                <span className="ml-auto font-bold text-slate-900">12%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="font-medium text-slate-600">Depleted</span>
                <span className="ml-auto font-bold text-slate-900">4%</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center">
            <Link
              href="/categories"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              View detailed category stock balance →
            </Link>
          </div>
        </article>
      </section>

      {/* Catalog Categories Showcase */}
      <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Featured Categories</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Direct access to product taxonomy from your connected FastAPI backend
            </p>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            <span>View All ({categories.length})</span>
            <UiIcon name="arrow" size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UiIcon name="layers" size={20} />
            </span>
            <h3 className="mt-3 text-sm font-bold text-slate-800">No categories found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Create your first category to see it featured here.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <UiIcon name="plus" size={14} />
              <span>Add Category</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 4).map((cat, idx) => {
              const imgUrl = getCategoryImageUrl(cat.image_url);
              const tone = toneGradients[idx % toneGradients.length];

              return (
                <Link
                  key={cat.id}
                  href={`/categories?search=${encodeURIComponent(cat.name)}`}
                  className="card-hover-lift group flex items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 transition hover:bg-white hover:border-emerald-200"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt={cat.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-tr ${tone} text-white`}
                      >
                        <UiIcon name="layers" size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                      {cat.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {cat.description || 'Active classification'}
                    </p>
                  </div>
                  <UiIcon name="arrow" size={14} className="text-slate-300 group-hover:text-emerald-600" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal for adding category directly from dashboard */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newCat) => {
          setCategories((prev) => [newCat, ...prev]);
        }}
      />
    </main>
  );
}
