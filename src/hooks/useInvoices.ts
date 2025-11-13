import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number; // Giá tại thời điểm mua (snapshot)
  unit: string;
}

// Snapshot thông tin voucher tại thời điểm tạo hóa đơn
export interface VoucherSnapshot {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  discountAmount: number; // Số tiền giảm thực tế đã áp dụng
}

// Snapshot thông tin promotion tại thời điểm tạo hóa đơn
export interface PromotionSnapshot {
  id: string;
  name: string;
  type: 'percent' | 'fixed' | 'buy_get';
  value: number;
  discountAmount: number; // Số tiền giảm thực tế đã áp dụng
}

// Snapshot thông tin bank account tại thời điểm tạo hóa đơn
export interface BankAccountSnapshot {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  bankCode: string; // short_name từ sepay.vn
  qrDescription?: string; // Nội dung QR code đã sử dụng
}

export interface Invoice {
  id: string;
  invoiceCode?: string; // Mã hóa đơn (HD000001, HD000002, ...)
  date: string;
  time: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  promotionDiscount?: number; // Giảm giá từ khuyến mãi
  voucherDiscount?: number; // Giảm giá từ voucher
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'debt';
  customerName?: string;
  customerId?: string;
  voucherCode?: string; // Deprecated: giữ lại để backward compatibility
  voucherSnapshot?: VoucherSnapshot; // Snapshot thông tin voucher
  promotionIds?: string[]; // Deprecated: giữ lại để backward compatibility
  promotionSnapshots?: PromotionSnapshot[]; // Snapshot thông tin promotions
  bankAccountSnapshot?: BankAccountSnapshot; // Snapshot thông tin tài khoản ngân hàng (nếu thanh toán chuyển khoản)
  createdAt?: Date;
  updatedAt?: Date;
}

export function useInvoices() {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    const invoicesRef = collection(db, 'users', currentUser.uid, 'invoices');
    // Query without orderBy to avoid index requirement, we'll sort manually
    const q = query(invoicesRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const invoicesData = snapshot.docs.map((doc) => {
          const data = doc.data();
          const invoice = {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to Date if needed
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          } as Invoice;
          console.log('Loaded invoice:', invoice.id, 'Invoice code:', invoice.invoiceCode);
          return invoice;
        }) as Invoice[];
        
        // Sort manually by createdAt (newest first)
        invoicesData.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          // If no createdAt, use date + time
          if (aDate === 0 && a.date) {
            const aDateTime = new Date(a.date + 'T' + (a.time || '00:00')).getTime();
            const bDateTime = b.date ? new Date(b.date + 'T' + (b.time || '00:00')).getTime() : 0;
            return bDateTime - aDateTime;
          }
          return bDate - aDate;
        });
        
        setInvoices(invoicesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching invoices:', error);
        setInvoices([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addInvoice = async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    try {
      const invoicesRef = collection(db, 'users', currentUser.uid, 'invoices');
      
      // Remove undefined values from invoice data (Firestore doesn't accept undefined)
      const cleanInvoice: any = {};
      Object.keys(invoice).forEach(key => {
        const value = (invoice as any)[key];
        if (value !== undefined && value !== null) {
          cleanInvoice[key] = value;
        }
      });
      
      console.log('Adding invoice to Firestore:', cleanInvoice);
      console.log('Invoice code:', cleanInvoice.invoiceCode);
      
      const newInvoice = {
        ...cleanInvoice,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(invoicesRef, newInvoice);
      console.log('Invoice saved with document ID:', docRef.id, 'Invoice code:', cleanInvoice.invoiceCode);
      return docRef.id;
    } catch (error: any) {
      console.error('Error adding invoice to Firestore:', error);
      // Re-throw with more context
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Check Firestore security rules for invoices collection');
      }
      throw error;
    }
  };

  const updateInvoice = async (id: string, invoice: Partial<Invoice>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const invoiceRef = doc(db, 'users', currentUser.uid, 'invoices', id);
    await updateDoc(invoiceRef, {
      ...invoice,
      updatedAt: new Date(),
    });
  };

  const deleteInvoice = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const invoiceRef = doc(db, 'users', currentUser.uid, 'invoices', id);
    await deleteDoc(invoiceRef);
  };

  return { invoices, loading, addInvoice, updateInvoice, deleteInvoice };
}

