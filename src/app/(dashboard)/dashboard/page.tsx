'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UiIcon } from '@/components/uiIcon';
import { getCategories, getCategoryImageUrl, type Category } from '@/services/categories';
import { getProducts, type Product } from '@/services/products';
import {
  getWarehousesInventory,
  getWarehouseInventoryMovements,
  type WarehousesInventory,
  type WarehouseInventoryMovement,
} from '@/services/warehouses_inventory';
import { useAppStore } from '@/store/useAppStore';
import CategoryFormModal from '@/components/categories/CategoryFormModal';

type Period = '7d' | '30d' | '90d';
type ChartPoint = { label: string; inbound: number; outbound: number };
const toneGradients = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-cyan-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

function makeChartPoints(movements: WarehouseInventoryMovement[], period: Period, now: Date): ChartPoint[] {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const buckets = period === '7d' ? 7 : period === '30d' ? 6 : 3;
  const points = Array.from({ length: buckets }, (_, index) => {
    const date = new Date(now);
    if (period === '7d') date.setDate(now.getDate() - (buckets - 1 - index));
    else if (period === '30d') date.setDate(now.getDate() - (buckets - 1 - index) * 5);
    else date.setMonth(now.getMonth() - (buckets - 1 - index));
    return {
      label: period === '7d'
        ? date.toLocaleDateString(undefined, { weekday: 'short' })
        : period === '30d'
          ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : date.toLocaleDateString(undefined, { month: 'short' }),
      inbound: 0,
      outbound: 0,
    };
  });
  const minTime = new Date(now);
  minTime.setDate(now.getDate() - days + 1);
  for (const movement of movements) {
    const date = new Date(movement.created_at);
    if (Number.isNaN(date.getTime()) || date < minTime || date > now) continue;
    let index: number;
    if (period === '7d') {
      index = Math.floor((date.setHours(0, 0, 0, 0) - new Date(minTime).setHours(0, 0, 0, 0)) / 86400000);
    } else if (period === '30d') {
      index = Math.floor((days - 1 - (now.getTime() - date.getTime()) / 86400000) / 5);
    } else {
      index = Math.floor((now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth());
      index = buckets - 1 - index;
    }
    index = Math.max(0, Math.min(buckets - 1, index));
    const quantity = Math.abs(Number(movement.quantity_change) || 0);
    const type = movement.movement_type.toLowerCase();
    if (type === 'received' || type === 'returned' || (type === 'adjusted' && movement.quantity_change > 0)) {
      points[index].inbound += quantity;
    } else if (type === 'sold' || (type === 'adjusted' && movement.quantity_change < 0)) {
      points[index].outbound += quantity;
    }
  }
  return points;
}

export default function DashboardPage() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<WarehousesInventory[]>([]);
  const [movements, setMovements] = useState<WarehouseInventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dataError, setDataError] = useState(false);
  const [period, setPeriod] = useState<Period>('7d');
  const [chartNow, setChartNow] = useState<Date | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [greeting, setGreeting] = useState('Welcome');
  const [todayStr, setTodayStr] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChartNow(new Date());
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
    setTodayStr(new Intl.DateTimeFormat(undefined, {
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date()));

    let active = true;
    const load = async () => {
      const productList: Product[] = [];
      const inventoryList: WarehousesInventory[] = [];
      const failures: boolean[] = [];
      const tasks = [
        getCategories().then((data) => { if (active) setCategories(data); }).catch(() => failures.push(true)),
        (async () => {
          try {
            for (let offset = 0; ; offset += 100) {
              const page = await getProducts(offset, 100);
              productList.push(...page);
              if (page.length < 100) break;
            }
            if (active) setProducts(productList);
          } catch { failures.push(true); }
        })(),
        (async () => {
          try {
            for (let offset = 0; ; offset += 100) {
              const page = await getWarehousesInventory({ offset, limit: 100 });
              inventoryList.push(...page);
              if (page.length < 100) break;
            }
            if (active) setInventory(inventoryList);
          } catch { failures.push(true); }
        })(),
        getWarehouseInventoryMovements().then((data) => { if (active) setMovements(data); }).catch(() => failures.push(true)),
      ];
      await Promise.all(tasks);
      if (active) {
        setDataError(failures.length > 0);
        setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const quantities = useMemo(() => {
    const totals = new Map<number, number>();
    for (const row of inventory) totals.set(Number(row.product_id), (totals.get(Number(row.product_id)) ?? 0) + Number(row.quantity || 0));
    for (const product of products) {
      if (product.total_quantity != null) totals.set(Number(product.id), Number(product.total_quantity));
    }
    return totals;
  }, [inventory, products]);

  const lowStockCount = products.filter((product) => {
    const status = product.stock_status?.toUpperCase();
    if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK') return true;
    if (status) return false;
    return (quantities.get(Number(product.id)) ?? 0) <= Number(product.min_stock || 0);
  }).length;
  const stockCounts = products.reduce((counts, product) => {
    const quantity = quantities.get(Number(product.id)) ?? 0;
    const status = product.stock_status?.toUpperCase();
    if (status === 'OUT_OF_STOCK' || quantity <= 0) counts.out++;
    else if (status === 'LOW_STOCK' || quantity <= Number(product.min_stock || 0)) counts.low++;
    else counts.healthy++;
    return counts;
  }, { healthy: 0, low: 0, out: 0 });
  const totalStockValue = products.reduce((sum, product) => sum + Number(product.cost_price || 0) * (quantities.get(Number(product.id)) ?? 0), 0);
  const chartPoints = useMemo(
    () => chartNow ? makeChartPoints(movements, period, chartNow) : [],
    [movements, period, chartNow],
  );
  const maxVal = Math.max(...chartPoints.map((p) => Math.max(p.inbound, p.outbound)), 1);
  const pointCoordinates = (key: 'inbound' | 'outbound') => chartPoints.map((p, idx) => {
    const x = chartPoints.length === 1 ? 260 : 30 + (idx * 460) / (chartPoints.length - 1);
    const y = 150 - (p[key] / maxVal) * 115;
    return `${x},${y}`;
  }).join(' ');
  const inboundPoints = pointCoordinates('inbound');
  const outboundPoints = pointCoordinates('outbound');
  const stockTotal = stockCounts.healthy + stockCounts.low + stockCounts.out;
  const healthyPercent = stockTotal ? Math.round((stockCounts.healthy / stockTotal) * 100) : 0;
  const lowPercent = stockTotal ? Math.round((stockCounts.low / stockTotal) * 100) : 0;
  const outPercent = stockTotal ? Math.max(0, 100 - healthyPercent - lowPercent) : 0;
  const healthyDegrees = healthyPercent * 3.6;
  const lowDegrees = healthyDegrees + lowPercent * 3.6;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{todayStr}</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {greeting}{mounted && currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-1 text-xs text-slate-500">Live overview from your catalog and warehouse inventory.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/categories" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50">Manage Categories</Link>
          <button type="button" onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700">
            <UiIcon name="plus" size={16} /> Add Category
          </button>
        </div>
      </section>

      {dataError && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">Some dashboard data could not be loaded from the API. Values below reflect the data that loaded successfully.</p>}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          { title: 'Catalog Categories', value: categories.length, subtitle: 'Categories from the API', icon: 'layers', iconClass: 'bg-emerald-50 text-emerald-600', detail: 'Current catalog groups' },
          { title: 'Tracked Products', value: products.length, subtitle: 'Products from the API', icon: 'box', iconClass: 'bg-blue-50 text-blue-600', detail: `Across ${categories.length} categories` },
          { title: 'Low Stock Alerts', value: lowStockCount, subtitle: 'At or below reorder threshold', icon: 'alert-triangle', iconClass: 'bg-amber-50 text-amber-600', detail: 'Based on product stock status and minimum stock' },
          { title: 'Inventory Cost Value', value: new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalStockValue), subtitle: 'Estimated at product cost', icon: 'trending-up', iconClass: 'bg-teal-50 text-teal-600', detail: 'Cost price × on-hand quantity' },
        ] as const).map((card) => (
          <article key={card.title} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center justify-between">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${card.iconClass}`}><UiIcon name={card.icon} size={20} /></span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Live API</span>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-slate-900">{loading ? '…' : card.value}</span>
              <span className="text-xs font-semibold text-slate-500">{card.subtitle}</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
        <article id="stock-movement" className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Analytics</span><h2 className="mt-1 text-base font-bold text-slate-900">Stock Movement &amp; Flow</h2><p className="text-xs text-slate-500">Quantities from stock movement history</p></div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
              {(['7d', '30d', '90d'] as const).map((range) => <button key={range} type="button" onClick={() => setPeriod(range)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${period === range ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>{range.toUpperCase()}</button>)}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Inbound</span>
            <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Outbound</span>
            {hoveredPoint && <span className="ml-auto rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] text-white">{hoveredPoint.label}: +{hoveredPoint.inbound} / -{hoveredPoint.outbound}</span>}
          </div>
          {loading ? <div className="mt-4 h-56 animate-pulse rounded-xl bg-slate-100" /> : movements.length === 0 ? <div className="grid h-56 place-items-center text-center text-xs text-slate-500">No stock movement records are available yet.</div> : (
            <div className="relative mt-4 h-56 w-full"><svg className="h-full w-full overflow-visible" viewBox="0 0 520 180" preserveAspectRatio="none" role="img" aria-label="Stock movement quantities from API">
              <defs><linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.25" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient></defs>
              {[35, 75, 115, 155].map((y) => <line key={y} x1="30" x2="490" y1={y} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" />)}
              <polygon points={`30,150 ${inboundPoints} 490,150`} fill="url(#emeraldGrad)" />
              <polyline points={inboundPoints} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={outboundPoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />
              {chartPoints.map((point, idx) => { const x = chartPoints.length === 1 ? 260 : 30 + idx * 460 / (chartPoints.length - 1); const y = 150 - point.inbound / maxVal * 115; return <g key={`${point.label}-${idx}`}><circle cx={x} cy={y} r="4" fill="white" stroke="#10b981" strokeWidth="2" onMouseEnter={() => setHoveredPoint(point)} onMouseLeave={() => setHoveredPoint(null)} /><text x={x} y="172" textAnchor="middle" fill="#94a3b8" fontSize="10">{point.label}</text></g>; })}
            </svg></div>
          )}
        </article>

        <article id="inventory" className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div><span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">Health</span><h2 className="mt-1 text-base font-bold text-slate-900">Inventory Status</h2><p className="text-xs text-slate-500">Calculated from current product stock</p></div>
          {loading ? <div className="my-6 h-36 animate-pulse rounded-xl bg-slate-100" /> : products.length === 0 ? <div className="grid flex-1 place-items-center py-10 text-center text-xs text-slate-500">No product stock data available.</div> : <>
            <div className="my-auto flex items-center justify-center gap-6 py-6">
              <div className="relative grid h-32 w-32 place-items-center"><div className="h-32 w-32 rounded-full" style={{ background: `conic-gradient(#10b981 0deg ${healthyDegrees}deg, #f59e0b ${healthyDegrees}deg ${lowDegrees}deg, #ef4444 ${lowDegrees}deg 360deg)` }} /><div className="absolute grid h-24 w-24 place-items-center rounded-full bg-white shadow-xs"><div className="text-center"><span className="block text-xl font-black text-slate-900">{healthyPercent}%</span><span className="block text-[9px] font-semibold text-slate-400">Healthy</span></div></div></div>
              <div className="flex flex-col gap-3 text-xs">
                {[['Healthy Stock', healthyPercent, 'bg-emerald-500'], ['Low Threshold', lowPercent, 'bg-amber-500'], ['Depleted', outPercent, 'bg-rose-500']].map(([label, value, color]) => <div key={String(label)} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="font-medium text-slate-600">{label}</span><span className="ml-auto font-bold text-slate-900">{value}%</span></div>)}
              </div>
            </div>
            <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">{stockCounts.healthy} healthy · {stockCounts.low} low · {stockCounts.out} depleted products</p>
          </>}
          <div className="border-t border-slate-100 pt-4 text-center"><Link href="/products" className="text-xs font-semibold text-emerald-600 hover:underline">View products →</Link></div>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><h2 className="text-base font-bold text-slate-900">Categories</h2><p className="mt-0.5 text-xs text-slate-500">Loaded from the categories API</p></div><Link href="/categories" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700">View All ({categories.length}) <UiIcon name="arrow" size={14} /></Link></div>
        {loading ? <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div> : categories.length === 0 ? <div className="py-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><UiIcon name="layers" size={20} /></span><h3 className="mt-3 text-sm font-bold text-slate-800">No categories found</h3><p className="mt-1 text-xs text-slate-500">Create your first category to see it here.</p><button type="button" onClick={() => setIsModalOpen(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"><UiIcon name="plus" size={14} /> Add Category</button></div> : <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{categories.slice(0, 4).map((category, idx) => { const imageUrl = getCategoryImageUrl(category.image_url); return <Link key={category.id} href={`/categories?search=${encodeURIComponent(category.name)}`} className="group flex items-center gap-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 transition hover:border-emerald-200 hover:bg-white"><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">{imageUrl ? <img src={imageUrl} alt={category.name} className="h-full w-full object-cover" /> : <div className={`flex h-full w-full items-center justify-center bg-gradient-to-tr ${toneGradients[idx % toneGradients.length]} text-white`}><UiIcon name="layers" size={18} /></div>}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-900">{category.name}</p><p className="truncate text-[11px] text-slate-400">{category.description || 'Category'}</p></div><UiIcon name="arrow" size={14} className="text-slate-300 group-hover:text-emerald-600" /></Link>; })}</div>}
      </section>
      <CategoryFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={(newCategory) => setCategories((previous) => [newCategory, ...previous])} />
    </main>
  );
}
