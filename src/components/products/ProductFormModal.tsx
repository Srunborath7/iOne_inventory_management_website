'use client';

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { UiIcon } from '@/components/uiIcon';
import {
  createProduct,
  updateProduct,
  getProductImageUrl,
  recordProductCreated,
  recordProductUpdated,
  type Product,
} from '@/services/products';
import { getCategories, type Category } from '@/services/categories';
import { getBrands, type Brand } from '@/services/brands';
import { useToast } from '@/components/toast/ToastContext';
import { useAppStore } from '@/store/useAppStore';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  productToEdit?: Product | null;
  categories?: Category[];
  brands?: Brand[];
}

function ProductFormDialog({
  onClose,
  onSuccess,
  productToEdit,
  categories: initialCategories = [],
  brands: initialBrands = [],
}: Omit<ProductFormModalProps, 'isOpen'>) {
  const toast = useToast();
  const currentUser = useAppStore((s) => s.currentUser);

  const [name, setName] = useState(productToEdit?.name ?? '');
  const [barcode, setBarcode] = useState(productToEdit?.barcode ?? '');
  const [categoryId, setCategoryId] = useState<number | string>(
    productToEdit?.category_id ?? (initialCategories[0]?.id ?? '')
  );
  const [brandId, setBrandId] = useState<number | string>(
    productToEdit?.brand_id ?? (initialBrands[0]?.id ?? '')
  );
  const [costPrice, setCostPrice] = useState<string>(
    productToEdit?.cost_price !== undefined ? String(productToEdit.cost_price) : ''
  );
  const [sellingPrice, setSellingPrice] = useState<string>(
    productToEdit?.selling_price !== undefined ? String(productToEdit.selling_price) : ''
  );
  const [minStock, setMinStock] = useState<string>(
    productToEdit?.min_stock !== undefined ? String(productToEdit.min_stock) : '10'
  );
  const [maxStock, setMaxStock] = useState<string>(
    productToEdit?.max_stock !== undefined ? String(productToEdit.max_stock) : '100'
  );
  const [description, setDescription] = useState(productToEdit?.description ?? '');
  const [isActive, setIsActive] = useState<boolean>(productToEdit?.is_active ?? true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    productToEdit ? getProductImageUrl(productToEdit.image_url) : null
  );

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(productToEdit);

  // Fetch categories & brands if empty
  useEffect(() => {
    let active = true;
    if (categories.length === 0 || brands.length === 0) {
      setLoadingOptions(true);
      Promise.all([
        categories.length === 0 ? getCategories().catch(() => []) : Promise.resolve(categories),
        brands.length === 0 ? getBrands().catch(() => []) : Promise.resolve(brands),
      ])
        .then(([cats, brs]) => {
          if (!active) return;
          if (cats.length > 0) {
            setCategories(cats);
            if (!categoryId && cats[0]) {
              setCategoryId(cats[0].id);
            }
          }
          if (brs.length > 0) {
            setBrands(brs);
            if (!brandId && brs[0]) {
              setBrandId(brs[0].id);
            }
          }
        })
        .finally(() => {
          if (active) setLoadingOptions(false);
        });
    }
    return () => {
      active = false;
    };
  }, [categories, brands, categoryId, brandId]);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG, JPG, WebP, etc.).');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // Margin preview calculation
  const parsedCost = parseFloat(costPrice) || 0;
  const parsedSell = parseFloat(sellingPrice) || 0;
  const profit = parsedSell - parsedCost;
  const marginPct = parsedSell > 0 ? ((profit / parsedSell) * 100).toFixed(1) : '0.0';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (!brandId) {
      setError('Please select a brand.');
      return;
    }
    if (parsedCost < 0 || isNaN(parsedCost)) {
      setError('Cost price must be a valid non-negative number.');
      return;
    }
    if (parsedSell < 0 || isNaN(parsedSell)) {
      setError('Selling price must be a valid non-negative number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        selling_price: parsedSell,
        cost_price: parsedCost,
        min_stock: parseInt(minStock, 10) || 0,
        max_stock: parseInt(maxStock, 10) || 100,
        barcode: barcode.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        brand_id: Number(brandId),
        category_id: Number(categoryId),
        is_active: isActive,
        image: imageFile,
      };

      if (isEditing && productToEdit) {
        const updated = await updateProduct(productToEdit.id, payload);
        recordProductUpdated(productToEdit, updated, currentUser);
        toast.success(`Product "${updated.name}" updated successfully!`);
        onSuccess(updated);
      } else {
        const created = await createProduct(payload);
        recordProductCreated(
          {
            ...created,
            creator: currentUser
              ? { id: currentUser.id, name: currentUser.name, email: currentUser.email }
              : created.creator,
          },
          currentUser
        );
        toast.success(`Product "${created.name}" created successfully!`);
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save product.';
      setError(msg);
      toast.error(msg, 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <UiIcon name={isEditing ? 'edit' : 'plus'} size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update product details, pricing, and stock limits.'
                  : 'Add a new product to your inventory catalog.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
            <UiIcon name="alert-triangle" size={16} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Row 1: Product Name & SKU/Barcode */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wireless Noise-Cancelling Headphones"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Barcode / SKU
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 880609123456"
                className="mt-1.5 w-full font-mono rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          {/* Row 2: Category & Brand selects */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Category <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={loadingOptions}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-8 text-xs font-medium text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value="" disabled>
                    Select Category
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <UiIcon name="arrow" size={14} className="rotate-90" />
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Brand <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <select
                  required
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  disabled={loadingOptions}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 pr-8 text-xs font-medium text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value="" disabled>
                    Select Brand
                  </option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <UiIcon name="arrow" size={14} className="rotate-90" />
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Pricing & Financials */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Cost Price ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-3 text-xs font-medium text-slate-900 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Selling Price ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-3 text-xs font-medium text-slate-900 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2 text-center">
                <span className="block text-[10px] font-semibold text-emerald-800">
                  Profit: ${profit.toFixed(2)}
                </span>
                <span className="block text-xs font-extrabold text-emerald-900">
                  Margin: {marginPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Row 4: Stock Thresholds */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Min Stock Alert (Units)
              </label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="10"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
              <span className="mt-1 block text-[10px] text-slate-400">
                Alert trigger when inventory drops below this quantity.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Max Stock Capacity (Units)
              </label>
              <input
                type="number"
                min="1"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                placeholder="100"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
              <span className="mt-1 block text-[10px] text-slate-400">
                Maximum optimal inventory level for storage.
              </span>
            </div>
          </div>

          {/* Row 5: Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide key product specifications or features..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          {/* Row 6: Image Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700">
              Product Image (Optional)
            </label>
            <div className="mt-1.5 flex items-center gap-4">
              {imagePreview ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Remove image"
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-900/80 text-white hover:bg-rose-600"
                  >
                    <UiIcon name="x" size={12} />
                  </button>
                </div>
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  <UiIcon name="image" size={24} />
                </div>
              )}

              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-image-upload"
                />
                <label
                  htmlFor="product-image-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                >
                  <UiIcon name="upload" size={14} />
                  <span>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                </label>
                <p className="mt-1 text-[11px] text-slate-400">
                  PNG, JPG, WebP up to 5MB. Square ratio recommended.
                </p>
              </div>
            </div>
          </div>

          {/* Row 7: Status Switch */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div>
              <span className="block text-xs font-bold text-slate-800">
                Listing Status
              </span>
              <span className="block text-[11px] text-slate-500">
                {isActive
                  ? 'Product is active and visible in catalog & sales operations.'
                  : 'Product is inactive or in draft status.'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </button>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading && <UiIcon name="refresh" size={14} className="animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductFormModal(props: ProductFormModalProps) {
  if (!props.isOpen) return null;
  return <ProductFormDialog {...props} />;
}
