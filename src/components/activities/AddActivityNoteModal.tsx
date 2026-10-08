'use client';

import { useState } from 'react';
import { UiIcon } from '@/components/uiIcon';
import { recordProductActivity, type Product, type ActivityType } from '@/services/products';
import { useToast } from '@/components/toast/ToastContext';
import { useAppStore } from '@/store/useAppStore';

interface AddActivityNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onActivityAdded?: () => void;
}

export default function AddActivityNoteModal({
  isOpen,
  onClose,
  products,
  onActivityAdded,
}: AddActivityNoteModalProps) {
  const toast = useToast();
  const currentUser = useAppStore((state) => state.currentUser);

  const [selectedProductId, setSelectedProductId] = useState<string | number>('');
  const [productSearch, setProductSearch] = useState('');
  const [actionType, setActionType] = useState<ActivityType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      String(p.id).includes(q)
    );
  });

  const selectedProduct = products.find((p) => String(p.id) === String(selectedProductId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error('Please select a product for this activity log.', 'Validation Error');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a note or description.', 'Validation Error');
      return;
    }

    setIsSubmitting(true);

    try {
      const authorName = customAuthor.trim() || currentUser?.name || 'Administrator';
      const authorEmail = currentUser?.email || 'admin@ione.com';
      const defaultTitle =
        actionType === 'note'
          ? 'Manual Audit Note'
          : actionType === 'price_change'
          ? 'Price Adjustment Note'
          : actionType === 'stock_threshold'
          ? 'Stock Threshold Audit'
          : 'Activity Note';

      recordProductActivity({
        product_id: selectedProductId,
        action: actionType,
        title: title.trim() || defaultTitle,
        description: description.trim(),
        user_name: authorName,
        user_email: authorEmail,
      });

      toast.success('Activity log entry has been recorded successfully!', 'Activity Logged');
      onActivityAdded?.();
      onClose();
      // Reset
      setSelectedProductId('');
      setTitle('');
      setDescription('');
      setCustomAuthor('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record activity log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UiIcon name="file-text" size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add User Activity Note</h2>
              <p className="text-xs text-slate-500">Record a manual audit trail entry or observation.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Product Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Target Product <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Search product by name or barcode..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-emerald-500/10"
            />
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-3 focus:ring-emerald-500/10"
            >
              <option value="">-- Choose a product ({filteredProducts.length} available) --</option>
              {filteredProducts.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} ({prod.barcode ? `Barcode: ${prod.barcode}` : `ID: #${prod.id}`})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <UiIcon name="check" size={12} />
                Selected: <span className="font-semibold">{selectedProduct.name}</span> (${Number(selectedProduct.selling_price).toFixed(2)})
              </p>
            )}
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Action Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'note', label: 'Audit Note', icon: 'file-text' as const },
                { id: 'price_change', label: 'Price Review', icon: 'trending-up' as const },
                { id: 'stock_threshold', label: 'Stock Limit', icon: 'alert-triangle' as const },
              ].map((item) => {
                const active = actionType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActionType(item.id as ActivityType)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UiIcon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Activity Title <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Annual Price Review, Warehouse Inspection"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-3 focus:ring-emerald-500/10"
            />
          </div>

          {/* Activity Note Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Log Details & Comments <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Write detailed remarks, reason for action, or operational observation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-3 focus:ring-emerald-500/10 resize-none"
            />
          </div>

          {/* User Attribution */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Logged By <span className="text-slate-400 font-normal">(Defaults to current user)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={currentUser?.name || 'Administrator'}
                value={customAuthor}
                onChange={(e) => setCustomAuthor(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden focus:ring-3 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50"
            >
              <UiIcon name="check" size={14} />
              <span>{isSubmitting ? 'Saving...' : 'Save Activity Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
