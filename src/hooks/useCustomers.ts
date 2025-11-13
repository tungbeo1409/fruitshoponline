import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface DebtHistory {
  id: string;
  previousAmount: number | undefined; // Số nợ trước đó
  newAmount: number; // Số nợ mới
  changeAmount: number; // Số tiền thay đổi (dương = thêm nợ, âm = trả nợ)
  action: 'add' | 'pay' | 'init'; // init = lần đầu, add = thêm nợ, pay = trả nợ
  note?: string; // Ghi chú
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string; // Không bắt buộc
  email?: string;
  address?: string;
  notes?: string;
  image?: string; // Ảnh khách hàng (base64)
  isActive?: boolean; // Mặc định true nếu không có
  debtAmount?: number; // Số tiền nợ (dương = nợ, âm = thiếu nợ, 0 = hết nợ, undefined = chưa quản lý)
  debtHistory?: DebtHistory[]; // Lịch sử dư nợ
  debtInvoiceIds?: string[]; // Danh sách ID các hóa đơn đang nợ
  totalSpent?: number; // Tổng số tiền đã mua
  purchaseCount?: number; // Số lần mua hàng
  purchaseFrequency?: number; // Tần suất mua hàng (số lần mua / số ngày từ ngày tạo)
  lastPurchaseDate?: Date; // Ngày mua hàng cuối cùng
  createdAt?: Date;
  updatedAt?: Date;
}

export function useCustomers() {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const customersRef = collection(db, 'users', currentUser.uid, 'customers');
    // Query without orderBy to avoid index requirement, we'll sort manually
    const q = query(customersRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const customersData = snapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert debtHistory timestamps to Date
          const debtHistory = data.debtHistory?.map((history: any) => ({
            ...history,
            createdAt: history.createdAt?.toDate ? history.createdAt.toDate() : history.createdAt,
          })) || [];
          
          return {
            id: doc.id,
            ...data,
            // Mặc định isActive = true nếu không có
            isActive: data.isActive !== undefined ? data.isActive : true,
            // Convert Firestore Timestamp to Date if needed
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            lastPurchaseDate: data.lastPurchaseDate?.toDate ? data.lastPurchaseDate.toDate() : data.lastPurchaseDate,
            debtHistory: debtHistory,
          };
        }) as Customer[];
        
        // Sort manually by totalSpent (descending), then by name
        customersData.sort((a, b) => {
          const aSpent = a.totalSpent || 0;
          const bSpent = b.totalSpent || 0;
          if (bSpent !== aSpent) {
            return bSpent - aSpent; // Sắp xếp theo số tiền mua giảm dần
          }
          return a.name.localeCompare(b.name); // Nếu bằng nhau thì sắp xếp theo tên
        });
        
        setCustomers(customersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching customers:', error);
        setCustomers([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    // Remove undefined values (Firestore doesn't accept undefined)
    const cleanCustomer: any = {};
    Object.keys(customer).forEach(key => {
      const value = (customer as any)[key];
      if (value !== undefined && value !== null) {
        cleanCustomer[key] = value;
      }
    });
    
    const customersRef = collection(db, 'users', currentUser.uid, 'customers');
    const newCustomer = {
      ...cleanCustomer,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(customersRef, newCustomer);
    return docRef.id;
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    // Always update name if provided
    if (customer.name !== undefined) {
      updateData.name = customer.name;
    }
    
    // For optional fields: if empty string, delete from Firestore; otherwise update
    const optionalFields: (keyof Customer)[] = ['phone', 'email', 'address', 'notes', 'image'];
    optionalFields.forEach(field => {
      if (customer[field] !== undefined) {
        // Field is provided in update
        if (customer[field] === '' || customer[field] === null) {
          // Empty string or null means delete the field
          updateData[field] = deleteField();
        } else {
          // Non-empty value means update it
          updateData[field] = customer[field];
        }
      }
    });
    
    // Handle isActive separately
    if (customer.isActive !== undefined) {
      updateData.isActive = customer.isActive;
    }
    
    // Handle debtAmount separately
    if (customer.debtAmount !== undefined) {
      updateData.debtAmount = customer.debtAmount;
    }
    
    // Handle debtHistory separately
    if (customer.debtHistory !== undefined) {
      updateData.debtHistory = customer.debtHistory;
    }
    
    // Handle debtInvoiceIds separately
    if (customer.debtInvoiceIds !== undefined) {
      updateData.debtInvoiceIds = customer.debtInvoiceIds;
    }
    
    // Handle purchase statistics separately
    if (customer.totalSpent !== undefined) {
      updateData.totalSpent = customer.totalSpent;
    }
    if (customer.purchaseCount !== undefined) {
      updateData.purchaseCount = customer.purchaseCount;
    }
    if (customer.purchaseFrequency !== undefined) {
      updateData.purchaseFrequency = customer.purchaseFrequency;
    }
    if (customer.lastPurchaseDate !== undefined) {
      updateData.lastPurchaseDate = customer.lastPurchaseDate;
    }
    
    const customerRef = doc(db, 'users', currentUser.uid, 'customers', id);
    await updateDoc(customerRef, updateData);
  };

  const deleteCustomer = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const customerRef = doc(db, 'users', currentUser.uid, 'customers', id);
    await deleteDoc(customerRef);
  };

  return { customers, loading, addCustomer, updateCustomer, deleteCustomer };
}

