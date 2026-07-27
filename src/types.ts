export interface PaymentRecord {
  id?: string;
  order_id: string;
  reference_id: string;
  customer_name: string;
  roll: string;
  amount: number;
  customer_phone: string;
  customer_email?: string;
  trxid?: string;
  status: 'paid' | 'pending' | 'failed' | 'manual';
  paid: boolean;
  payment_method?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePaymentPayload {
  customer_name: string;
  roll: string;
  amount: number;
  customer_phone: string;
  customer_email?: string;
  notes?: string;
}

export interface EPayCreateResponse {
  status: 'success' | 'error';
  payment_url?: string;
  order_id?: string;
  reference_id?: string;
  amount?: number;
  store_name?: string;
  currency?: string;
  message?: string;
}

export interface EPayStatusResponse {
  status: 'success' | 'pending' | 'failed' | 'error';
  order_id: string;
  reference_id?: string;
  amount?: number;
  order_status?: string;
  trxid?: string;
  paid?: boolean;
  message?: string;
  customer_name?: string;
  customer_phone?: string;
}
