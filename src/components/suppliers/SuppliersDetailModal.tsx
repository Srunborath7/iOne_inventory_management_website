'use client';

import { UiIcon } from '@/components/uiIcon';
import type { Suppliers } from '@/services/suppliers';

interface Props {
  isOpen: boolean;
  supplier: Suppliers | null;
  onClose: () => void;
  onEdit: (supplier: Suppliers) => void;
  onDelete: (supplier: Suppliers) => void;
}

export default function SuppliersDetailModal({ isOpen, supplier, onClose, onEdit, onDelete }: Props) {
  if (!isOpen || !supplier) return null;
  const details = [
    ['Age', supplier.age], ['Gender', supplier.gender], ['Contact', supplier.contact],
    ['Phone', supplier.phone], ['Address', supplier.address], ['Status', supplier.is_active === false ? 'Inactive' : 'Active'],
  ] as const;
  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="supplier-detail-title" className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <header className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Supplier details</p><h2 id="supplier-detail-title" className="mt-1 text-xl font-bold text-slate-900">{supplier.name}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><UiIcon name="x" size={18} /></button>
        </header>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value || '—'}</dd></div>)}
        </dl>
        {supplier.note && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">Note</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{supplier.note}</p></div>}
        <footer className="mt-5 flex justify-between border-t border-slate-100 pt-4">
          <button type="button" onClick={() => onDelete(supplier)} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button><button type="button" onClick={() => onEdit(supplier)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Edit supplier</button></div>
        </footer>
      </section>
    </div>
  );
}
