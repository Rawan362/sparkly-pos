export type Seller = {
  chat_id: string;
  business_name_location: string | null;
  selling_type_audience: string | null;
  business_category: string | null;
  phone_number_id: string | null;
  meta_token: string | null;
  business_phone: string | null;
};

export type SellerProduct = {
  id: string;
  chat_id: string;
  product_name: string;
  product_code: string | null;
  product_category: string | null;
  wholesale_price: number | null;
  retail_price: number | null;
  target_customers: string | null;
  key_features: string | null;
  common_questions: string | null;
  payment_methods: string | null;
  delivery_info: string | null;
  competitors_difference: string | null;
  special_offers: string | null;
  is_active: boolean;
  track_stock: boolean;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  unit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PosSettings = {
  chat_id: string;
  inventory_tracking_active: boolean;
  low_stock_alerts_active: boolean;
  low_stock_default_threshold: number | null;
  auto_invoice_active: boolean;
  invoice_prefix: string | null;
  next_invoice_number: number | null;
  language: string;
  currency: string;
};

export type Location = {
  id: string;
  chat_id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  is_default: boolean;
  created_at: string;
};

export type ProductStockByLocation = {
  id: string;
  product_id: string;
  location_id: string;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  updated_at: string;
};

export type PricingTier = {
  id: string;
  chat_id: string;
  name: string;
  adjustment_percent: number;
  is_default: boolean;
};

export type CustomUnit = {
  id: string;
  chat_id: string;
  name: string;
  short_name: string;
  allow_decimal: boolean;
};

export type Customer = {
  phone: string;
  name: string | null;
  is_wholesale: boolean;
  total_orders: number | null;
  total_spent: number | null;
  last_purchase_date: string | null;
  is_vip: boolean;
  list_status: string | null;
  seller_id: string;
};

export type Expense = {
  id: string;
  chat_id: string;
  amount: number;
  category: string | null;
  description: string | null;
  expense_date: string;
  created_at: string;
};

export type OrderStatus = "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type Order = {
  id: string;
  customer_id: string | null;
  phone: string | null;
  product_name: string | null;
  product_price: number | null;
  order_total: number | null;
  delivery_address: string | null;
  order_status: OrderStatus | string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  cod_collected: boolean | null;
  seller_id: string;
  created_at: string;
  // Added for the POS Checkout screen -- null on every order Ahmad creates
  // via chat, since none of these apply to that flow.
  checkout_id: string | null;
  quantity: number | null;
  pricing_tier_id: string | null;
  discount_percent: number | null;
  payment_method: string | null;
  amount_paid: number | null;
  invoice_number: string | null;
  is_wholesale: boolean;
  location_id: string | null;
};
