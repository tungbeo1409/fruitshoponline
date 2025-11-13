import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Voucher {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  quantity: number;
  used: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expired';
  // Áp dụng cho sản phẩm: null = tất cả, array = danh sách product IDs
  productIds: string[] | null;
  // Áp dụng cho khách hàng: null = tất cả, array = danh sách customer IDs
  customerIds: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useVouchers() {
  const { currentUser } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setVouchers([]);
      setLoading(false);
      return;
    }

    const vouchersRef = collection(db, 'users', currentUser.uid, 'vouchers');
    const q = query(vouchersRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const vouchersData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Đảm bảo productIds và customerIds có giá trị mặc định
            productIds: data.productIds === undefined ? null : data.productIds,
            customerIds: data.customerIds === undefined ? null : data.customerIds,
            used: data.used || 0,
          };
        }) as Voucher[];
        
        // Tính toán status dựa trên ngày và số lượng
        const today = new Date().toISOString().split('T')[0];
        const vouchersWithStatus = vouchersData.map(voucher => {
          let status: 'active' | 'inactive' | 'expired' = 'inactive';
          if (voucher.endDate < today || voucher.used >= voucher.quantity) {
            status = 'expired';
          } else if (voucher.startDate <= today) {
            status = 'active';
          }
          return { ...voucher, status };
        });
        
        setVouchers(vouchersWithStatus);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching vouchers:', error);
        setVouchers([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addVoucher = async (voucher: Omit<Voucher, 'id' | 'status' | 'used' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const vouchersRef = collection(db, 'users', currentUser.uid, 'vouchers');
    const today = new Date().toISOString().split('T')[0];
    let status: 'active' | 'inactive' | 'expired' = 'inactive';
    if (voucher.endDate < today) {
      status = 'expired';
    } else if (voucher.startDate <= today) {
      status = 'active';
    }
    
    const newVoucher = {
      ...voucher,
      used: 0,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(vouchersRef, newVoucher);
    return docRef.id;
  };

  const updateVoucher = async (id: string, voucher: Partial<Voucher>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const voucherRef = doc(db, 'users', currentUser.uid, 'vouchers', id);
    const today = new Date().toISOString().split('T')[0];
    
    // Tính lại status nếu có thay đổi về ngày hoặc số lượng
    let status = voucher.status;
    if (voucher.startDate || voucher.endDate || voucher.used !== undefined || voucher.quantity !== undefined) {
      const startDate = voucher.startDate || vouchers.find(v => v.id === id)?.startDate || '';
      const endDate = voucher.endDate || vouchers.find(v => v.id === id)?.endDate || '';
      const used = voucher.used !== undefined ? voucher.used : vouchers.find(v => v.id === id)?.used || 0;
      const quantity = voucher.quantity !== undefined ? voucher.quantity : vouchers.find(v => v.id === id)?.quantity || 0;
      
      if (endDate < today || used >= quantity) {
        status = 'expired';
      } else if (startDate <= today) {
        status = 'active';
      } else {
        status = 'inactive';
      }
    }
    
    await updateDoc(voucherRef, {
      ...voucher,
      status,
      updatedAt: new Date(),
    });
  };

  const deleteVoucher = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const voucherRef = doc(db, 'users', currentUser.uid, 'vouchers', id);
    await deleteDoc(voucherRef);
  };

  const useVoucher = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const voucher = vouchers.find(v => v.id === id);
    if (!voucher) throw new Error('Voucher not found');
    
    if (voucher.used >= voucher.quantity) {
      throw new Error('Voucher đã hết lượt sử dụng');
    }
    
    const voucherRef = doc(db, 'users', currentUser.uid, 'vouchers', id);
    const newUsed = voucher.used + 1;
    const today = new Date().toISOString().split('T')[0];
    let status: 'active' | 'inactive' | 'expired' = voucher.status;
    
    if (newUsed >= voucher.quantity || voucher.endDate < today) {
      status = 'expired';
    }
    
    await updateDoc(voucherRef, {
      used: newUsed,
      status,
      updatedAt: new Date(),
    });
  };

  return { vouchers, loading, addVoucher, updateVoucher, deleteVoucher, useVoucher };
}

