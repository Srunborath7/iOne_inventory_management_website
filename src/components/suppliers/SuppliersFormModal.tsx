'use client';

import { useState, type FormEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import { createSuppliers, updateSuppliers, type Suppliers } from '@/services/suppliers';
import { useToast } from '@/components/toast/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplier: Suppliers) => void;
  supplierToEdit?: Suppliers | null;
}

export default function SuppliersFormModal({ isOpen, onClose, onSuccess, supplierToEdit }: Props) {
  const toast = useToast();
  const [name, setName] = useState(supplierToEdit?.name ?? '');
  const [age, setAge] = useState(String(supplierToEdit?.age ?? ''));
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(
    supplierToEdit?.gender === 'female' || supplierToEdit?.gender === 'other' ? supplierToEdit.gender : 'male'
  );
  const [contact, setContact] = useState(supplierToEdit?.contact ?? '');
  const [phone, setPhone] = useState(supplierToEdit?.phone ?? '');
  const [address, setAddress] = useState(supplierToEdit?.address ?? '');
  const [note, setNote] = useState(supplierToEdit?.note ?? '');
  const [isActive, setIsActive] = useState(supplierToEdit?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;
  const editing = Boolean(supplierToEdit);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedAge = Number(age);
    if (!trimmedName) return setError('Supplier name is required.');
    if (!age || !Number.isFinite(parsedAge) || parsedAge < 0) return setError('Enter a valid age.');
    setLoading(true);
    setError('');
    const values = {
      name: trimmedName,
      age: parsedAge,
      gender,
      contact: contact.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      note: note.trim() || null,
      is_active: isActive,
    };
    try {
      const saved = editing && supplierToEdit
        ? await updateSuppliers(supplierToEdit.id, values)
        : await createSuppliers(values);
      onSuccess(saved);
      toast.success(`Supplier “${saved.name}” ${editing ? 'updated' : 'created'}.`);
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not save supplier.';
      setError(message);
      toast.error(message, 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10';
  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="supplier-form-title" className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h2 id="supplier-form-title" className="text-lg font-bold text-slate-900">{editing ? 'Edit supplier' : 'Add supplier'}</h2>
            <p className="mt-1 text-sm text-slate-500">Enter the supplier’s contact and business details.</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><UiIcon name="x" size={18} /></button>
        </header>
        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Name *<input required maxLength={120} autoFocus value={name} onChange={(e) => setName(e.target.value)} className={`${fieldClass} mt-1`} placeholder="Supplier name" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">Age *<input required min="0" type="number" value={age} onChange={(e) => setAge(e.target.value)} className={`${fieldClass} mt-1`} /></label>
            <label className="block text-sm font-medium text-slate-700">Gender<select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className={`${fieldClass} mt-1`}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
            <label className="block text-sm font-medium text-slate-700">Contact<input value={contact} onChange={(e) => setContact(e.target.value)} className={`${fieldClass} mt-1`} placeholder="Contact person" /></label>
            <label className="block text-sm font-medium text-slate-700">Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${fieldClass} mt-1`} placeholder="Phone number" /></label>
          </div>
          <label className="block text-sm font-medium text-slate-700">Address<input value={address} onChange={(e) => setAddress(e.target.value)} className={`${fieldClass} mt-1`} placeholder="Business address" /></label>
          <label className="block text-sm font-medium text-slate-700">Note<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={`${fieldClass} mt-1 resize-y`} placeholder="Optional notes" /></label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" />Active supplier</label>
          <footer className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{loading ? 'Saving…' : editing ? 'Save changes' : 'Create supplier'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
