"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { UiIcon } from "@/components/uiIcon";
import WarehousesFormModal from "@/components/warehouses/WarehousesFormModal";
import WarehousesDetailModal from "@/components/warehouses/WarehousesDetailModal";
import WarehousesDeleteModal from "@/components/warehouses/WarehousesDeleteModal";
import StockTransferModal from "@/components/warehouses/StockTransferModal";
import AddWarehouseInventoryModal from "@/components/warehouses/AddWarehouseInventoryModal";
import AdjustStockModal from "@/components/warehouses/AdjustStockModal";
import {
  deleteWarehouses,
  getWarehouses,
  type Warehouses,
} from "@/services/warehouses";
import {
  getWarehousesInventory,
  deleteWarehouseInventory,
  type WarehousesInventory,
} from "@/services/warehouses_inventory";
import { getProducts, getProductImageUrl, type Product } from "@/services/products";
import { useToast } from "@/components/toast/ToastContext";
import { formatDate } from "@/lib/format_date";

type ViewMode = "grid" | "table";
type SortOrder = "newest" | "oldest" | "alpha-asc" | "alpha-desc" | "units-desc";
type TabType = "facilities" | "inventory";

function WarehousesContent() {
  const toast = useToast();
  const searchParams = useSearchParams();

  // Data states
  const [warehouses, setWarehouses] = useState<Warehouses[]>([]);
  const [inventory, setInventory] = useState<WarehousesInventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Navigation & filtering states
  const [activeTab, setActiveTab] = useState<TabType>("facilities");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [inventoryWarehouseFilter, setInventoryWarehouseFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouses | null>(null);
  const [detail, setDetail] = useState<Warehouses | null>(null);
  const [deleting, setDeleting] = useState<Warehouses | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Advanced inventory modals
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFromWhId, setTransferFromWhId] = useState<number | null>(null);
  const [transferProdId, setTransferProdId] = useState<number | null>(null);

  const [addInventoryOpen, setAddInventoryOpen] = useState(false);
  const [addInventoryWhId, setAddInventoryWhId] = useState<number | null>(null);

  const [adjustingItem, setAdjustingItem] = useState<WarehousesInventory | null>(null);

  // Fetch all initial warehouse, inventory, and product data
  const loadData = useCallback(() => {
    Promise.all([
      getWarehouses().catch(() => []),
      getWarehousesInventory().catch(() => []),
      getProducts().catch(() => []),
    ])
      .then(([whList, invList, prodList]) => {
        setWarehouses(whList);
        setInventory(invList);
        setProducts(prodList);
        setError("");
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Could not load warehouses data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregated KPI Metrics
  const metrics = useMemo(() => {
    const totalWarehouses = warehouses.length;
    const activeWarehouses = warehouses.filter((w) => w.is_active !== false).length;
    const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const distinctProductIds = new Set(inventory.map((item) => item.product_id));
    const totalDistinctProducts = distinctProductIds.size;

    return {
      totalWarehouses,
      activeWarehouses,
      totalUnits,
      totalDistinctProducts,
    };
  }, [warehouses, inventory]);

  // Map of warehouseId -> stats (total units, SKU count)
  const warehouseStatsMap = useMemo(() => {
    const map = new Map<number, { units: number; skus: number }>();
    for (const item of inventory) {
      const whId = Number(item.warehouses_id);
      const current = map.get(whId) || { units: 0, skus: 0 };
      current.units += item.quantity;
      current.skus += 1;
      map.set(whId, current);
    }
    return map;
  }, [inventory]);

  // Filtered & Sorted Warehouses
  const visibleWarehouses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = warehouses.filter((wh) => {
      // Status filter
      if (statusFilter === "active" && wh.is_active === false) return false;
      if (statusFilter === "inactive" && wh.is_active !== false) return false;

      // Text search
      if (!query) return true;
      return (
        wh.name.toLowerCase().includes(query) ||
        wh.code.toLowerCase().includes(query) ||
        (wh.address && wh.address.toLowerCase().includes(query)) ||
        (wh.description && wh.description.toLowerCase().includes(query)) ||
        String(wh.id).includes(query)
      );
    });

    list.sort((a, b) => {
      if (sortOrder === "alpha-asc") return a.name.localeCompare(b.name);
      if (sortOrder === "alpha-desc") return b.name.localeCompare(a.name);
      if (sortOrder === "units-desc") {
        const aUnits = warehouseStatsMap.get(Number(a.id))?.units || 0;
        const bUnits = warehouseStatsMap.get(Number(b.id))?.units || 0;
        return bUnits - aUnits;
      }
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "oldest" ? aDate - bDate : bDate - aDate;
    });

    return list;
  }, [warehouses, search, statusFilter, sortOrder, warehouseStatsMap]);

  // Filtered Inventory Ledger
  const visibleInventory = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inventory.filter((item) => {
      // Warehouse filter
      if (inventoryWarehouseFilter !== "all" && String(item.warehouses_id) !== inventoryWarehouseFilter) {
        return false;
      }

      // Search filter
      if (!query) return true;
      const prod = products.find((p) => Number(p.id) === Number(item.product_id));
      const wh = warehouses.find((w) => Number(w.id) === Number(item.warehouses_id));
      return (
        (prod && prod.name.toLowerCase().includes(query)) ||
        (prod?.barcode && prod.barcode.toLowerCase().includes(query)) ||
        (wh && wh.name.toLowerCase().includes(query)) ||
        (wh && wh.code.toLowerCase().includes(query)) ||
        String(item.id).includes(query)
      );
    });
  }, [inventory, inventoryWarehouseFilter, search, products, warehouses]);

  // Handlers for warehouse CRUD
  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(wh: Warehouses) {
    setDetail(null);
    setEditing(wh);
    setFormOpen(true);
  }

  function saveWarehouse(saved: Warehouses) {
    setWarehouses((current) => {
      const index = current.findIndex((item) => item.id === saved.id);
      if (index < 0) return [saved, ...current];
      return current.map((item) => (item.id === saved.id ? saved : item));
    });
    // If detail modal is open for this warehouse, update it
    if (detail && detail.id === saved.id) {
      setDetail(saved);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteWarehouses(deleting.id);
      setWarehouses((current) => current.filter((item) => item.id !== deleting.id));
      setInventory((current) => current.filter((item) => Number(item.warehouses_id) !== Number(deleting.id)));
      toast.success(`Warehouse “${deleting.name}” deleted.`);
      setDeleting(null);
      setDetail(null);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not delete warehouse.",
        "Delete failed"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // Stock transfer modal trigger
  function handleOpenTransfer(whId?: number, prodId?: number) {
    setTransferFromWhId(whId ?? null);
    setTransferProdId(prodId ?? null);
    setTransferOpen(true);
  }

  // Add inventory modal trigger
  function handleOpenAddInventory(whId?: number) {
    setAddInventoryWhId(whId ?? null);
    setAddInventoryOpen(true);
  }

  async function handleRemoveInventoryItem(itemId: number | string, prodName: string) {
    if (!confirm(`Are you sure you want to remove "${prodName}" from this warehouse?`)) return;
    try {
      await deleteWarehouseInventory(itemId);
      setInventory((prev) => prev.filter((i) => i.id !== itemId));
      toast.success(`Removed "${prodName}" from warehouse inventory.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove item.", "Delete failed");
    }
  }

  const adjustingProduct = adjustingItem
    ? products.find((p) => Number(p.id) === Number(adjustingItem.product_id))
    : null;
  const adjustingWarehouse = adjustingItem
    ? warehouses.find((w) => Number(w.id) === Number(adjustingItem.warehouses_id))
    : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Logistics & Facilities
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            Warehouses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage distribution facilities, track physical stock levels, and transfer inventory across locations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            id="btn-transfer-stock"
            onClick={() => handleOpenTransfer()}
            disabled={warehouses.length < 2 || inventory.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800 shadow-2xs transition hover:bg-teal-100 active:scale-95 disabled:opacity-50"
          >
            <UiIcon name="arrow-right-left" size={16} />
            <span>Transfer Stock</span>
          </button>

          <button
            type="button"
            id="btn-add-warehouse"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
          >
            <UiIcon name="plus" size={16} />
            <span>Add Warehouse</span>
          </button>
        </div>
      </header>

      {/* KPI Stats Cards */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Total Warehouses */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <p className="text-xs font-medium text-slate-500">Total Facilities</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600">
              <UiIcon name="building-2" size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.totalWarehouses}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {metrics.activeWarehouses} active locations
          </p>
        </div>

        {/* Operational Status */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <p className="text-xs font-medium text-slate-500">Operational</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <UiIcon name="check" size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">
            {metrics.activeWarehouses}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">
            {metrics.totalWarehouses > 0
              ? `${Math.round((metrics.activeWarehouses / metrics.totalWarehouses) * 100)}% active`
              : "No facilities"}
          </p>
        </div>

        {/* Total Units Stored */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <p className="text-xs font-medium text-slate-500">Units in Storage</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <UiIcon name="boxes" size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.totalUnits.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Across all warehouses
          </p>
        </div>

        {/* Product SKUs Tracked */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <p className="text-xs font-medium text-slate-500">Catalog Lines</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <UiIcon name="box" size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics.totalDistinctProducts}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Distinct SKUs stocked
          </p>
        </div>
      </section>

      {/* Tabs Switcher: Facilities Overview vs. Stock Ledger */}
      <div className="mt-6 flex border-b border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("facilities")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition ${
            activeTab === "facilities"
              ? "border-emerald-600 text-emerald-800 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UiIcon name="building-2" size={15} />
          <span>Warehouse Facilities ({warehouses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition ${
            activeTab === "inventory"
              ? "border-emerald-600 text-emerald-800 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UiIcon name="boxes" size={15} />
          <span>Cross-Facility Stock Ledger ({inventory.length})</span>
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <label className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 text-slate-400 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 sm:max-w-xs">
          <UiIcon name="search" size={16} />
          <input
            id="warehouse-search"
            type="text"
            aria-label="Filter warehouses or stock"
            placeholder={activeTab === "facilities" ? "Filter by name, code, address..." : "Filter by product, barcode..."}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <UiIcon name="x" size={12} />
            </button>
          )}
        </label>

        {/* Filters and View toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          {/* Status Filter for Facilities Tab */}
          {activeTab === "facilities" ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hidden text-[11px] text-slate-400 sm:inline">Status:</span>
              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          ) : (
            /* Warehouse Filter for Inventory Ledger Tab */
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hidden text-[11px] text-slate-400 sm:inline">Warehouse:</span>
              <select
                aria-label="Filter by Warehouse"
                value={inventoryWarehouseFilter}
                onChange={(e) => setInventoryWarehouseFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="all">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort order (Facilities tab) */}
          {activeTab === "facilities" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hidden text-[11px] text-slate-400 sm:inline">Sort:</span>
              <select
                aria-label="Sort Warehouses"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="newest">Newest Added</option>
                <option value="oldest">Oldest Added</option>
                <option value="alpha-asc">Name (A → Z)</option>
                <option value="alpha-desc">Name (Z → A)</option>
                <option value="units-desc">Highest Stock Units</option>
              </select>
            </div>
          )}

          {/* View Mode Toggle (Grid vs Table) */}
          {activeTab === "facilities" && (
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                  viewMode === "grid"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UiIcon name="layout-grid" size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                aria-pressed={viewMode === "table"}
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                  viewMode === "table"
                    ? "bg-white text-emerald-700 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UiIcon name="layout-list" size={16} />
              </button>
            </div>
          )}

          {/* Quick Assign in ledger tab */}
          {activeTab === "inventory" && (
            <button
              type="button"
              onClick={() => handleOpenAddInventory()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700"
            >
              <UiIcon name="plus" size={14} />
              <span>Assign Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-14 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <UiIcon name="refresh" size={20} className="animate-spin" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-700">Loading warehouses and inventory…</p>
            <p className="text-xs text-slate-400">Connecting to facility catalog</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <UiIcon name="alert-triangle" size={24} />
            </div>
            <p role="alert" className="mt-3 text-sm font-bold text-rose-700">
              {error}
            </p>
            <p className="mt-1 text-xs text-slate-500">Failed to communicate with inventory API.</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <UiIcon name="refresh" size={14} />
              Try again
            </button>
          </div>
        ) : activeTab === "facilities" ? (
          /* ================= FACILITIES TAB ================= */
          visibleWarehouses.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                <UiIcon name="building-2" size={24} />
              </div>
              <p className="mt-3 font-bold text-slate-800">
                {search || statusFilter !== "all"
                  ? "No facilities match your search criteria."
                  : "No warehouses registered yet."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {search || statusFilter !== "all"
                  ? "Try resetting the filters or searching with another keyword."
                  : "Add your first warehouse location to begin tracking inventory distributions."}
              </p>
              {!search && statusFilter === "all" && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <UiIcon name="plus" size={14} />
                  Add First Warehouse
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">N°</th>
                    <th className="px-5 py-3.5">Facility</th>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Address</th>
                    <th className="px-5 py-3.5">Inventory Held</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created At</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleWarehouses.map((wh, index) => {
                    const stats = warehouseStatsMap.get(Number(wh.id)) || { units: 0, skus: 0 };
                    return (
                      <tr key={wh.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 text-xs font-medium text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setDetail(wh)}
                            className="font-bold text-slate-900 hover:text-emerald-700 transition text-left"
                          >
                            {wh.name}
                          </button>
                          {wh.description && (
                            <p className="mt-0.5 text-xs text-slate-400 truncate max-w-xs">
                              {wh.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                            {wh.code}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 max-w-[200px] truncate">
                          {wh.address || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900">{stats.units.toLocaleString()}</span>
                            <span className="text-[11px] text-slate-400">units</span>
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-500 font-semibold">
                              {stats.skus} SKUs
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              wh.is_active === false
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            }`}
                          >
                            {wh.is_active === false ? "Inactive" : "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {formatDate(wh.created_at || "-")}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDetail(wh)}
                              aria-label={`View details of ${wh.name}`}
                              title="View Facility & Manage Inventory"
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition"
                            >
                              <UiIcon name="eye" size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenTransfer(Number(wh.id))}
                              aria-label={`Transfer stock from ${wh.name}`}
                              title="Transfer Stock"
                              className="rounded-lg p-2 text-teal-600 hover:bg-teal-50 transition"
                            >
                              <UiIcon name="arrow-right-left" size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(wh)}
                              aria-label={`Edit ${wh.name}`}
                              title="Edit Facility"
                              className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition"
                            >
                              <UiIcon name="edit" size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(wh)}
                              aria-label={`Delete ${wh.name}`}
                              title="Delete Facility"
                              className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition"
                            >
                              <UiIcon name="trash" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid Cards View */
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleWarehouses.map((wh) => {
                const stats = warehouseStatsMap.get(Number(wh.id)) || { units: 0, skus: 0 };
                return (
                  <article
                    key={wh.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                  >
                    <div>
                      {/* Top Bar: Code badge & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                          {wh.code}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            wh.is_active === false
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                          }`}
                        >
                          {wh.is_active === false ? "Inactive" : "Active"}
                        </span>
                      </div>

                      {/* Title & Address */}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setDetail(wh)}
                          className="text-left font-extrabold text-slate-900 hover:text-emerald-700 transition"
                        >
                          <h2 className="text-base truncate">{wh.name}</h2>
                        </button>
                        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500">
                          <UiIcon name="map-pin" size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{wh.address || "No address specified"}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {wh.description && (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                          {wh.description}
                        </p>
                      )}

                      {/* Stock Statistics Snapshot */}
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total Units</p>
                          <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                            {stats.units.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Stocked SKUs</p>
                          <p className="mt-0.5 text-sm font-extrabold text-teal-800">
                            {stats.skus} items
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Strip */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setDetail(wh)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
                      >
                        <UiIcon name="eye" size={14} />
                        <span>Manage Stock</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenTransfer(Number(wh.id))}
                          title="Transfer stock from this warehouse"
                          className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50 transition"
                        >
                          <UiIcon name="arrow-right-left" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(wh)}
                          title="Edit warehouse"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition"
                        >
                          <UiIcon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(wh)}
                          title="Delete warehouse"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition"
                        >
                          <UiIcon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : (
          /* ================= INVENTORY LEDGER TAB ================= */
          visibleInventory.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                <UiIcon name="boxes" size={24} />
              </div>
              <p className="mt-3 font-bold text-slate-800">
                {search || inventoryWarehouseFilter !== "all"
                  ? "No inventory records match your filters."
                  : "No stock registered in any warehouse."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Assign products to warehouses to begin tracking cross-facility storage.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddInventory()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <UiIcon name="plus" size={14} />
                Assign Product Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5">Barcode / SKU</th>
                    <th className="px-5 py-3.5">Warehouse Location</th>
                    <th className="px-5 py-3.5">Current Stock</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Last Updated</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleInventory.map((item) => {
                    const prod = products.find((p) => Number(p.id) === Number(item.product_id));
                    const wh = warehouses.find((w) => Number(w.id) === Number(item.warehouses_id));
                    const imgUrl = prod ? getProductImageUrl(prod.image_url) : null;
                    const isOutOfStock = item.quantity === 0;
                    const isLowStock = prod ? item.quantity <= prod.min_stock : false;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {imgUrl ? (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <Image
                                  src={imgUrl}
                                  alt={prod?.name || "Product"}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs">
                                <UiIcon name="box" size={18} />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {prod?.name || `Product #${item.product_id}`}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {prod?.selling_price ? `$${Number(prod.selling_price).toFixed(2)}` : "Price not set"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {prod?.barcode || "—"}
                        </td>

                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-800">{wh?.name || `Warehouse #${item.warehouses_id}`}</p>
                          <p className="text-[11px] font-mono text-slate-400">{wh?.code}</p>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="text-sm font-extrabold text-slate-900">
                            {item.quantity.toLocaleString()}
                          </span>
                          <span className="ml-1 text-[11px] text-slate-400">units</span>
                        </td>

                        <td className="px-5 py-3.5">
                          {isOutOfStock ? (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              Depleted
                            </span>
                          ) : isLowStock ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              Low Stock
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              In Stock
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {formatDate(item.updated_at || "-")}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setAdjustingItem(item)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                            >
                              Adjust
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenTransfer(Number(item.warehouses_id), Number(item.product_id))}
                              title="Transfer stock to another warehouse"
                              className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50"
                            >
                              <UiIcon name="arrow-right-left" size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveInventoryItem(item.id, prod?.name || `Product #${item.product_id}`)}
                              title="Remove from warehouse"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                            >
                              <UiIcon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {/* Footer Info Count */}
      {!loading && !error && (
        <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
          <span>
            {activeTab === "facilities"
              ? `Showing ${visibleWarehouses.length} of ${warehouses.length} facilities`
              : `Showing ${visibleInventory.length} of ${inventory.length} inventory records`}
          </span>
          <span className="font-medium text-slate-400">
            Total Stored Units: {metrics.totalUnits.toLocaleString()}
          </span>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Create / Edit Warehouse Modal */}
      <WarehousesFormModal
        key={editing?.id ?? "new"}
        isOpen={formOpen}
        warehouseToEdit={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={saveWarehouse}
      />

      {/* Warehouse Detail & Inventory Inspector Modal */}
      <WarehousesDetailModal
        isOpen={Boolean(detail)}
        warehouse={detail}
        inventory={inventory}
        products={products}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onDelete={(wh) => {
          setDetail(null);
          setDeleting(wh);
        }}
        onRefreshData={loadData}
        onOpenTransfer={(whId, prodId) => {
          setDetail(null);
          handleOpenTransfer(whId, prodId);
        }}
        onOpenAddInventory={(whId) => {
          setDetail(null);
          handleOpenAddInventory(whId);
        }}
      />

      {/* Safe Delete Warehouse Modal */}
      <WarehousesDeleteModal
        isOpen={Boolean(deleting)}
        warehouse={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        key={`transfer-${transferFromWhId}-${transferProdId}`}
        isOpen={transferOpen}
        warehouses={warehouses}
        inventory={inventory}
        products={products}
        initialFromWarehouseId={transferFromWhId}
        initialProductId={transferProdId}
        onClose={() => {
          setTransferOpen(false);
          setTransferFromWhId(null);
          setTransferProdId(null);
        }}
        onSuccess={loadData}
      />

      {/* Assign Product to Warehouse Modal */}
      <AddWarehouseInventoryModal
        key={`assign-${addInventoryWhId}`}
        isOpen={addInventoryOpen}
        warehouseId={addInventoryWhId}
        warehouses={warehouses}
        products={products}
        existingInventory={inventory}
        onClose={() => {
          setAddInventoryOpen(false);
          setAddInventoryWhId(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <AdjustStockModal
          isOpen={Boolean(adjustingItem)}
          inventoryItem={adjustingItem}
          product={adjustingProduct}
          warehouse={adjustingWarehouse}
          onClose={() => setAdjustingItem(null)}
          onSuccess={() => {
            loadData();
            setAdjustingItem(null);
          }}
        />
      )}
    </main>
  );
}

export default function WarehousesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-14 text-center">
          <p className="text-sm font-semibold text-slate-500">Loading Warehouses…</p>
        </div>
      }
    >
      <WarehousesContent />
    </Suspense>
  );
}
