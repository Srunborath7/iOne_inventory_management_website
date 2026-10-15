'use client';

import { useState, type FormEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import {
  createWarehouses,
  updateWarehouses,
  type CreateWarehousesInput,
  type Warehouses,
} from '@/services/warehouses';
import { useToast } from '@/components/toast/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (warehouse: Warehouses) => void;
  warehouseToEdit?: Warehouses | null;
}

export default function WarehousesFormModal({
  isOpen,
  onClose,
  onSuccess,
  warehouseToEdit,
}: Props) {
  const toast = useToast();
  const [name, setName] = useState(warehouseToEdit?.name ?? '');
  const [code, setCode] = useState(warehouseToEdit?.code ?? '');
  const [address, setAddress] = useState(warehouseToEdit?.address ?? '');
  const [description, setDescription] = useState(warehouseToEdit?.description ?? '');
  const [isActive, setIsActive] = useState(warehouseToEdit?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;
  const editing = Boolean(warehouseToEdit);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setError('Warehouse name is required.');
      return;
    }
    if (!trimmedCode) {
      setError('Warehouse code is required.');
      return;
    }
    if (!trimmedAddress) {
      setError('Warehouse address is required.');
      return;
    }

    setLoading(true);
    setError('');
    const values: CreateWarehousesInput = {
      name: trimmedName,
      code: trimmedCode,
      address: trimmedAddress,
      description: description.trim() || null,
      is_active: isActive,
    };

    try {
      const saved = editing && warehouseToEdit
        ? await updateWarehouses(warehouseToEdit.id, values)
        : await createWarehouses(values);
      onSuccess(saved);
      toast.success(`Warehouse “${saved.name}” ${editing ? 'updated' : 'created'}.`);
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save warehouse.';
      setError(message);
      toast.error(message, 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10';

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-xs animate-fade-in"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-form-title"
        className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
      >
        <header className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <UiIcon name="building-2" size={20} />
            </span>
            <div>
              <h2 id="warehouse-form-title" className="text-lg font-bold text-slate-900">
                {editing ? 'Edit Warehouse' : 'Add New Warehouse'}
              </h2>
              <p className="text-xs text-slate-500">
                {editing
                  ? 'Update facility location and configuration details.'
                  : 'Register a new storage location or distribution hub.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <UiIcon name="x" size={18} />
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700"
          >
            <UiIcon name="alert-triangle" size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between">
              <label htmlFor="wh-name" className="text-xs font-semibold text-slate-700">
                Warehouse Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">{name.length}/50</span>
            </div>
            <input
              id="wh-name"
              required
              maxLength={50}
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder="e.g. Central Phnom Penh Hub"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex justify-between">
                <label htmlFor="wh-code" className="text-xs font-semibold text-slate-700">
                  Facility Code <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">{code.length}/50</span>
              </div>
              <input
                id="wh-code"
                required
                maxLength={50}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className={`${fieldClass} mt-1.5 uppercase font-mono tracking-wider`}
                placeholder="e.g. WH-PP-01"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Status
              </label>
              <div className="mt-1.5 flex h-10 items-center">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Active for Storage & Transfers</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <label htmlFor="wh-address" className="text-xs font-semibold text-slate-700">
                Physical Address <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">{address.length}/100</span>
            </div>
            <input
              id="wh-address"
              required
              maxLength={100}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className={`${fieldClass} mt-1.5`}
              placeholder="e.g. No. 42, St. 271, Sangkat Boeung Tumpun"
            />
          </div>

          <div>
            <div className="flex justify-between">
              <label htmlFor="wh-description" className="text-xs font-semibold text-slate-700">
                Description (Optional)
              </label>
              <span className="text-[11px] text-slate-400">{description.length}/255</span>
            </div>
            <textarea
              id="wh-description"
              rows={3}
              maxLength={255}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${fieldClass} mt-1.5 resize-y`}
              placeholder="e.g. Primary facility for consumer electronics and accessories storage"
            />
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
            >
              {loading && <UiIcon name="refresh" size={14} className="animate-spin" />}
              <span>{loading ? 'Saving...' : editing ? 'Save Changes' : 'Create Warehouse'}</span>
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
