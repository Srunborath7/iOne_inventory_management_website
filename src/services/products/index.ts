export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductImageUrl,
} from './products.api';
export {
  getProductActivities,
  getAllActivities,
  recordProductActivity,
  recordProductCreated,
  recordProductUpdated,
  addProductActivityNote,
  deleteActivityLog,
  clearProductActivities,
  generateDefaultActivities,
} from './activity.service';
export type {
  ProductResponse,
  Product,
  ProductCreator,
  CreateProductInput,
  UpdateProductInput,
  ActivityLog,
  ActivityType,
  ActivityDiff,
} from './type';

