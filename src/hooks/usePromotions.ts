import { useState, useEffect } from 'react';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface Promotion {
  id: string;
  name: string;
  type: 'percent' | 'fixed' | 'buy_get';
  value: number;
  minPurchase: number;
  quantity: number; // Tổng số lần có thể sử dụng
  used: number; // Số lần đã sử dụng
  startDate: string;
  endDate: string;
  status: 'active' | 'inactive' | 'expired';
  description: string;
  // Áp dụng cho sản phẩm: null = tất cả, array = danh sách product IDs
  productIds: string[] | null;
  // Áp dụng cho khách hàng: null = tất cả, array = danh sách customer IDs
  customerIds: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export function usePromotions() {
  const { currentUser } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setPromotions([]);
      setLoading(false);
      return;
    }

    const promotionsRef = collection(db, 'users', currentUser.uid, 'promotions');
    const q = query(promotionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const promotionsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Đảm bảo productIds và customerIds có giá trị mặc định
            productIds: data.productIds === undefined ? null : data.productIds,
            customerIds: data.customerIds === undefined ? null : data.customerIds,
            quantity: data.quantity || 0,
            used: data.used || 0,
          };
        }) as Promotion[];
        
        // Tính toán status dựa trên ngày và số lượng
        const today = new Date().toISOString().split('T')[0];
        const promotionsWithStatus = promotionsData.map(promo => {
          let status: 'active' | 'inactive' | 'expired' = 'inactive';
          if (promo.endDate < today || (promo.quantity > 0 && promo.used >= promo.quantity)) {
            status = 'expired';
          } else if (promo.startDate <= today) {
            status = 'active';
          }
          return { ...promo, status };
        });
        
        setPromotions(promotionsWithStatus);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching promotions:', error);
        setPromotions([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const addPromotion = async (promotion: Omit<Promotion, 'id' | 'status' | 'used' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const promotionsRef = collection(db, 'users', currentUser.uid, 'promotions');
    const today = new Date().toISOString().split('T')[0];
    let status: 'active' | 'inactive' | 'expired' = 'inactive';
    if (promotion.endDate < today) {
      status = 'expired';
    } else if (promotion.startDate <= today) {
      status = 'active';
    }
    
    const newPromotion = {
      ...promotion,
      used: 0, // New promotions start with 0 used
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const docRef = await addDoc(promotionsRef, newPromotion);
    return docRef.id;
  };

  const updatePromotion = async (id: string, promotion: Partial<Omit<Promotion, 'status' | 'used'>>) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const promotionRef = doc(db, 'users', currentUser.uid, 'promotions', id);
    const today = new Date().toISOString().split('T')[0];
    
    // Tính lại status nếu có thay đổi về ngày hoặc số lượng
    let status = promotion.status;
    if (promotion.startDate || promotion.endDate || promotion.quantity !== undefined) {
      const startDate = promotion.startDate || promotions.find(p => p.id === id)?.startDate || '';
      const endDate = promotion.endDate || promotions.find(p => p.id === id)?.endDate || '';
      const used = promotions.find(p => p.id === id)?.used || 0;
      const quantity = promotion.quantity !== undefined ? promotion.quantity : promotions.find(p => p.id === id)?.quantity || 0;
      
      if (endDate < today || (quantity > 0 && used >= quantity)) {
        status = 'expired';
      } else if (startDate <= today) {
        status = 'active';
      } else {
        status = 'inactive';
      }
    }
    
    await updateDoc(promotionRef, {
      ...promotion,
      ...(status && { status }),
      updatedAt: new Date(),
    });
  };

  const deletePromotion = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const promotionRef = doc(db, 'users', currentUser.uid, 'promotions', id);
    await deleteDoc(promotionRef);
  };

  const usePromotion = async (id: string) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const promotion = promotions.find(p => p.id === id);
    if (!promotion) throw new Error('Promotion not found');
    
    if (promotion.quantity > 0 && promotion.used >= promotion.quantity) {
      throw new Error('Promotion đã hết lượt sử dụng');
    }
    
    const promotionRef = doc(db, 'users', currentUser.uid, 'promotions', id);
    const newUsed = promotion.used + 1;
    const today = new Date().toISOString().split('T')[0];
    let status: 'active' | 'inactive' | 'expired' = promotion.status;
    
    if ((promotion.quantity > 0 && newUsed >= promotion.quantity) || promotion.endDate < today) {
      status = 'expired';
    }
    
    await updateDoc(promotionRef, {
      used: newUsed,
      status,
      updatedAt: new Date(),
    });
  };

  return { promotions, loading, addPromotion, updatePromotion, deletePromotion, usePromotion };
}

