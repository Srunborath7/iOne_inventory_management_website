import type { ActivityLog, ActivityType, ActivityDiff, Product } from './type';

const STORAGE_PREFIX = 'inv_product_activity_';

function getStorageKey(productId: string | number): string {
  return `${STORAGE_PREFIX}${productId}`;
}

/**
 * Generate default synthesized baseline activity log for any product
 * if no manual logs have been recorded yet.
 */
export function generateDefaultActivities(product: Product): ActivityLog[] {
  const activities: ActivityLog[] = [];
  const creatorName = product.creator?.full_name || product.creator?.name || 'Administrator';
  const creatorEmail = product.creator?.email || 'admin@ione.com';

  const createdAt = product.created_at || new Date(Date.now() - 86400000 * 3).toISOString();
  const updatedAt = product.updated_at || createdAt;

  // 1. Creation event
  activities.push({
    id: `act-create-${product.id}`,
    product_id: product.id,
    action: 'create',
    title: 'Product Created',
    description: `Initial product registration with barcode ${product.barcode || 'N/A'}.`,
    user_name: creatorName,
    user_email: creatorEmail,
    created_at: createdAt,
    diff: [
      { field: 'selling_price', label: 'Selling Price', new_value: `$${Number(product.selling_price || 0).toFixed(2)}` },
      { field: 'cost_price', label: 'Cost Price', new_value: `$${Number(product.cost_price || 0).toFixed(2)}` },
      { field: 'min_stock', label: 'Min Stock Alert', new_value: `${product.min_stock ?? 0} units` },
      { field: 'max_stock', label: 'Max Stock Limit', new_value: `${product.max_stock ?? 0} units` },
      { field: 'is_active', label: 'Status', new_value: product.is_active ? 'Active' : 'Draft' },
    ],
  });

  // 2. If updated after created, add update event
  if (product.updated_at && product.updated_at !== product.created_at) {
    activities.unshift({
      id: `act-update-${product.id}`,
      product_id: product.id,
      action: 'update',
      title: 'Product Information Updated',
      description: 'Product specifications and inventory parameters refreshed.',
      user_name: 'Inventory Manager',
      user_email: 'manager@ione.com',
      created_at: updatedAt,
      diff: [
        { field: 'selling_price', label: 'Selling Price', new_value: `$${Number(product.selling_price || 0).toFixed(2)}` },
        { field: 'status', label: 'Status', new_value: product.is_active ? 'Active' : 'Draft' },
      ],
    });
  }

  return activities;
}

/**
 * Fetch all activity logs for a given product
 */
export function getProductActivities(productId: string | number, productFallback?: Product | null): ActivityLog[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getStorageKey(productId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore json error
  }

  if (productFallback) {
    const defaults = generateDefaultActivities(productFallback);
    try {
      localStorage.setItem(getStorageKey(productId), JSON.stringify(defaults));
    } catch {
      // ignore
    }
    return defaults;
  }

  return [];
}

/**
 * Record a new activity entry
 */
export function recordProductActivity(
  activity: Omit<ActivityLog, 'id' | 'created_at'> & { created_at?: string }
): ActivityLog {
  const newEntry: ActivityLog = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: activity.created_at || new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const key = getStorageKey(activity.product_id);
      const existing = getProductActivities(activity.product_id);
      const updated = [newEntry, ...existing];
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('inventory:activity-updated', { detail: { productId: activity.product_id } }));
    } catch {
      // ignore storage error
    }
  }

  return newEntry;
}

/**
 * Helper to record product creation
 */
export function recordProductCreated(
  product: Product,
  user?: { name?: string; email?: string } | null
): ActivityLog {
  const userName = user?.name || product.creator?.full_name || product.creator?.name || 'Current User';
  const userEmail = user?.email || product.creator?.email || '';

  return recordProductActivity({
    product_id: product.id,
    action: 'create',
    title: 'Product Created',
    description: `Product "${product.name}" was registered with barcode ${product.barcode || 'N/A'}.`,
    user_name: userName,
    user_email: userEmail,
    diff: [
      { field: 'name', label: 'Product Name', new_value: product.name },
      { field: 'selling_price', label: 'Selling Price', new_value: `$${Number(product.selling_price).toFixed(2)}` },
      { field: 'cost_price', label: 'Cost Price', new_value: `$${Number(product.cost_price).toFixed(2)}` },
      { field: 'min_stock', label: 'Min Stock Alert', new_value: `${product.min_stock ?? 0} units` },
      { field: 'max_stock', label: 'Max Stock Limit', new_value: `${product.max_stock ?? 0} units` },
      { field: 'is_active', label: 'Status', new_value: product.is_active ? 'Active' : 'Draft' },
    ],
  });
}

/**
 * Helper to record changes when product is updated
 */
export function recordProductUpdated(
  prev: Product,
  next: Product,
  user?: { name?: string; email?: string } | null
): ActivityLog | null {
  const diffs: ActivityDiff[] = [];
  let action: ActivityType = 'update';
  let title = 'Product Updated';

  if (prev.name !== next.name) {
    diffs.push({ field: 'name', label: 'Name', old_value: prev.name, new_value: next.name });
  }

  if (Number(prev.selling_price) !== Number(next.selling_price)) {
    action = 'price_change';
    title = 'Selling Price Adjusted';
    diffs.push({
      field: 'selling_price',
      label: 'Selling Price',
      old_value: `$${Number(prev.selling_price).toFixed(2)}`,
      new_value: `$${Number(next.selling_price).toFixed(2)}`,
    });
  }

  if (Number(prev.cost_price) !== Number(next.cost_price)) {
    diffs.push({
      field: 'cost_price',
      label: 'Cost Price',
      old_value: `$${Number(prev.cost_price).toFixed(2)}`,
      new_value: `$${Number(next.cost_price).toFixed(2)}`,
    });
  }

  if (Number(prev.min_stock) !== Number(next.min_stock) || Number(prev.max_stock) !== Number(next.max_stock)) {
    if (action !== 'price_change') {
      action = 'stock_threshold';
      title = 'Stock Thresholds Modified';
    }
    if (Number(prev.min_stock) !== Number(next.min_stock)) {
      diffs.push({
        field: 'min_stock',
        label: 'Min Stock',
        old_value: `${prev.min_stock} units`,
        new_value: `${next.min_stock} units`,
      });
    }
    if (Number(prev.max_stock) !== Number(next.max_stock)) {
      diffs.push({
        field: 'max_stock',
        label: 'Max Stock',
        old_value: `${prev.max_stock} units`,
        new_value: `${next.max_stock} units`,
      });
    }
  }

  if (Boolean(prev.is_active) !== Boolean(next.is_active)) {
    action = 'status_change';
    title = next.is_active ? 'Product Activated' : 'Product Deactivated (Draft)';
    diffs.push({
      field: 'is_active',
      label: 'Status',
      old_value: prev.is_active ? 'Active' : 'Draft',
      new_value: next.is_active ? 'Active' : 'Draft',
    });
  }

  if (prev.category_id !== next.category_id) {
    diffs.push({
      field: 'category_id',
      label: 'Category',
      old_value: prev.category?.name || `#${prev.category_id}`,
      new_value: next.category?.name || `#${next.category_id}`,
    });
  }

  if (prev.brand_id !== next.brand_id) {
    diffs.push({
      field: 'brand_id',
      label: 'Brand',
      old_value: prev.brand?.name || `#${prev.brand_id}`,
      new_value: next.brand?.name || `#${next.brand_id}`,
    });
  }

  if (prev.image_url !== next.image_url) {
    diffs.push({
      field: 'image_url',
      label: 'Product Image',
      old_value: prev.image_url ? 'Previous Image' : 'No Image',
      new_value: next.image_url ? 'New Image' : 'Removed Image',
    });
  }

  if (diffs.length === 0) {
    diffs.push({
      field: 'general',
      label: 'Details',
      old_value: 'Previous specs',
      new_value: 'Updated specs',
    });
  }

  const userName = user?.name || next.creator?.full_name || next.creator?.name || 'Inventory Staff';
  const userEmail = user?.email || next.creator?.email || '';

  return recordProductActivity({
    product_id: next.id,
    action,
    title,
    description: `Product attributes modified by ${userName}.`,
    user_name: userName,
    user_email: userEmail,
    diff: diffs,
  });
}

/**
 * Add a manual activity note / comment to a product's audit trail
 */
export function addProductActivityNote(
  productId: string | number,
  note: string,
  user?: { name?: string; email?: string } | null
): ActivityLog {
  const userName = user?.name || 'Staff Member';
  const userEmail = user?.email || '';

  return recordProductActivity({
    product_id: productId,
    action: 'note',
    title: 'Audit Note Added',
    description: note.trim(),
    user_name: userName,
    user_email: userEmail,
  });
}

/**
 * Fetch and aggregate all activity logs across ALL products
 */
export function getAllActivities(products: Product[] = []): (ActivityLog & { product_name?: string })[] {
  if (typeof window === 'undefined') return [];

  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(String(p.id), p));

  const allLogs: (ActivityLog & { product_name?: string })[] = [];
  const coveredProductIds = new Set<string>();

  // 1. Scan localStorage for any stored activities
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const pId = key.replace(STORAGE_PREFIX, '');
        coveredProductIds.add(pId);
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((log: ActivityLog) => {
              const matchedProduct = productMap.get(String(log.product_id));
              allLogs.push({
                ...log,
                product_name: matchedProduct?.name || `Product #${log.product_id}`,
              });
            });
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Synthesize baseline logs for any product not yet in storage
  products.forEach((product) => {
    if (!coveredProductIds.has(String(product.id))) {
      const defaults = generateDefaultActivities(product);
      defaults.forEach((log) => {
        allLogs.push({
          ...log,
          product_name: product.name,
        });
      });
    }
  });

  // 3. Sort by created_at descending
  return allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Delete a specific activity log entry
 */
export function deleteActivityLog(productId: string | number, logId: string | number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = getStorageKey(productId);
    const existing = getProductActivities(productId);
    const updated = existing.filter((item) => String(item.id) !== String(logId));
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('inventory:activity-updated', { detail: { productId } }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all activities for a product
 */
export function clearProductActivities(productId: string | number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = getStorageKey(productId);
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('inventory:activity-updated', { detail: { productId } }));
    return true;
  } catch {
    return false;
  }
}

