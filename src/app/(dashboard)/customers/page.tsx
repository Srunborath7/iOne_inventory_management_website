"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UiIcon } from "@/components/uiIcon";
import CustomersFormModal from "@/components/customers/CustomersFormModal";
import CustomersDetailModal from "@/components/customers/CustomersDetailModal";
import CustomersDeleteModal from "@/components/customers/CustomersDeleteModal";
import {
  deleteCustomers,
  getCustomers,
  type Customers,
} from "@/services/customers";
import { useToast } from "@/components/toast/ToastContext";
import { formatDate } from "@/lib/format_date";

type ViewMode = "grid" | "table";
type SortOrder = "newest" | "oldest" | "alpha-asc" | "alpha-desc";

function CustomersContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [Customers, setCustomers] = useState<Customers[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customers | null>(null);
  const [detail, setDetail] = useState<Customers | null>(null);
  const [deleting, setDeleting] = useState<Customers | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await getCustomers());
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load Customers.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = Customers.filter(
      (customer) =>
        !query ||
        [
          customer.name,
          customer.contact,
          customer.phone,
          customer.address,
          customer.note,
        ].some((value) => value?.toLowerCase().includes(query)) ||
        String(customer.id).includes(query),
    );
    filtered.sort((a, b) => {
      if (sortOrder === "alpha-asc") return a.name.localeCompare(b.name);
      if (sortOrder === "alpha-desc") return b.name.localeCompare(a.name);
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    });
    return filtered;
  }, [Customers, search, sortOrder]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(customer: Customers) {
    setDetail(null);
    setEditing(customer);
    setFormOpen(true);
  }
  function save(customer: Customers) {
    setCustomers((current) => {
      const index = current.findIndex((item) => item.id === customer.id);
      if (index < 0) return [customer, ...current];
      return current.map((item) => (item.id === customer.id ? customer : item));
    });
  }
  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteCustomers(deleting.id);
      setCustomers((current) =>
        current.filter((item) => item.id !== deleting.id),
      );
      toast.success(`customer “${deleting.name}” deleted.`);
      setDeleting(null);
      setDetail(null);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not delete customer.",
        "Delete failed",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Inventory partners
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
            Customers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customer contacts and account details.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          <UiIcon name="plus" size={16} />
          Add customer
        </button>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total Customers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {Customers.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {
              Customers.filter((customer) => customer.is_active !== false)
                .length
            }
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 text-slate-400 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 sm:max-w-xs">
          <UiIcon name="search" size={16} />
          <input
            type="text"
            aria-label="Search Customers"
            placeholder="Filter Customers..."
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
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="hidden text-[11px] text-slate-400 sm:inline">Sort:</span>
            <select
              aria-label="Sort Customers"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="newest">Newest Added</option>
              <option value="oldest">Oldest Added</option>
              <option value="alpha-asc">Name (A → Z)</option>
              <option value="alpha-desc">Name (Z → A)</option>
            </select>
          </div>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
            <button type="button" onClick={() => setViewMode("grid")} aria-label="Grid view" aria-pressed={viewMode === "grid"} className={`grid h-8 w-8 place-items-center rounded-lg ${viewMode === "grid" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              <UiIcon name="layout-grid" size={16} />
            </button>
            <button type="button" onClick={() => setViewMode("table")} aria-label="Table view" aria-pressed={viewMode === "table"} className={`grid h-8 w-8 place-items-center rounded-lg ${viewMode === "table" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              <UiIcon name="layout-list" size={16} />
            </button>
          </div>
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">
            Loading Customers…
          </p>
        ) : error ? (
          <div className="p-10 text-center">
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : visibleCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-slate-800">
              {search ? "No Customers match your search." : "No Customers yet."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try another name, phone, or contact."
                : "Add a customer to keep their details organized."}
            </p>
            {!search && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Add customer
              </button>
            )}
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">N°</th>
                  <th className="px-5 py-3">customer</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Create At</th>
                  <th className="px-5 py-3">Update At</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleCustomers.map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      {index + 1 }
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setDetail(customer)}
                        className="font-semibold text-slate-900 hover:text-emerald-700"
                      >
                        {customer.name}
                      </button>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {customer.address || "No address"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.contact || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${customer.is_active === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {customer.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(customer.created_at || "-")}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(customer.updated_at || "-")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => setDetail(customer)}
                          aria-label={`View ${customer.name}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        >
                          <UiIcon name="eye" size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(customer)}
                          aria-label={`Edit ${customer.name}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <UiIcon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(customer)}
                          aria-label={`Delete ${customer.name}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <UiIcon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCustomers.map((customer) => (
              <article key={customer.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setDetail(customer)} className="min-w-0 text-left">
                    <h2 className="truncate font-bold text-slate-900 hover:text-emerald-700">{customer.name}</h2>
                    <p className="mt-1 truncate text-xs text-slate-500">{customer.contact || "No contact listed"}</p>
                  </button>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${customer.is_active === false ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>
                    {customer.is_active === false ? "Inactive" : "Active"}
                  </span>
                </div>
                <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Phone</dt><dd className="truncate font-medium text-slate-800">{customer.phone || "—"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Address</dt><dd className="truncate text-right font-medium text-slate-800">{customer.address || "—"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Create At</dt><dd className="truncate text-right font-medium text-slate-800">{formatDate(customer.created_at || "—")}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Update At</dt><dd className="truncate text-right font-medium text-slate-800">{formatDate(customer.updated_at || "—")}</dd></div>
                </dl>
                <div className="mt-3 flex justify-end gap-1">
                  <button type="button" onClick={() => setDetail(customer)} aria-label={`View ${customer.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><UiIcon name="eye" size={16} /></button>
                  <button type="button" onClick={() => openEdit(customer)} aria-label={`Edit ${customer.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"><UiIcon name="edit" size={16} /></button>
                  <button type="button" onClick={() => setDeleting(customer)} aria-label={`Delete ${customer.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><UiIcon name="trash" size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {!loading && !error && (
        <p className="mt-3 px-1 text-xs text-slate-500">
          Showing {visibleCustomers.length} of {Customers.length} Customers
        </p>
      )}

      <CustomersFormModal
        key={editing?.id ?? "new"}
        isOpen={formOpen}
        customerToEdit={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={save}
      />
      <CustomersDetailModal
        isOpen={Boolean(detail)}
        customer={detail}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onDelete={(customer) => {
          setDetail(null);
          setDeleting(customer);
        }}
      />
      <CustomersDeleteModal
        isOpen={Boolean(deleting)}
        Customers={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={isDeleting}
      />
    </main>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-slate-500">
          Loading Customers…
        </div>
      }
    >
      <CustomersContent />
    </Suspense>
  );
}
