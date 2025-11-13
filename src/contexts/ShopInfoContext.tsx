import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useAlert } from '../components/AlertDialog';

export interface BankAccount {
  id: string; // Unique ID for each bank account
  bankName: string; // Tên ngân hàng
  bankCode?: string; // Short_name của ngân hàng (từ sepay.vn)
  accountNumber: string; // Số tài khoản
  accountHolder: string; // Tên chủ tài khoản
  isDefault?: boolean; // QR mặc định để hiển thị khi thanh toán chuyển khoản
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  taxCode?: string;
  description?: string;
  logo?: string;
  bankAccounts?: BankAccount[]; // Danh sách tài khoản ngân hàng
  invoiceCounter?: number; // Counter để tạo mã hóa đơn (HD000001, HD000002, ...)
}

interface ShopInfoContextType {
  shopInfo: ShopInfo | null;
  loading: boolean;
  updateShopInfo: (info: Partial<ShopInfo>) => Promise<void>;
}

const defaultShopInfo: ShopInfo = {
  name: 'Fruit Shop',
  address: '123 Đường ABC, Q.1, TP.HCM',
  phone: '0901 234 567',
  email: '',
  taxCode: '',
  description: '',
};

const ShopInfoContext = createContext<ShopInfoContextType | undefined>(undefined);

export function useShopInfo() {
  const context = useContext(ShopInfoContext);
  if (context === undefined) {
    throw new Error('useShopInfo must be used within a ShopInfoProvider');
  }
  return context;
}

interface ShopInfoProviderProps {
  children: ReactNode;
}

export function ShopInfoProvider({ children }: ShopInfoProviderProps) {
  const { currentUser } = useAuth();
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { alert, AlertComponent } = useAlert();

  useEffect(() => {
    if (!currentUser) {
      setShopInfo(null);
      setLoading(false);
      return;
    }

    const shopInfoRef = doc(db, 'shopInfo', currentUser.uid);

    // Listen for real-time updates
    const unsubscribe = onSnapshot(
      shopInfoRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setShopInfo(snapshot.data() as ShopInfo);
        } else {
          // Create default shop info if it doesn't exist
          setDoc(shopInfoRef, defaultShopInfo).then(() => {
            setShopInfo(defaultShopInfo);
          }).catch((error) => {
            console.error('Error creating default shop info:', error);
            // If permission denied, just use default without saving
            if (error.code === 'permission-denied') {
              setShopInfo(defaultShopInfo);
            }
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching shop info:', error);
        // If permission denied, use default shop info
        if (error.code === 'permission-denied') {
          setShopInfo(defaultShopInfo);
        } else {
          setShopInfo(defaultShopInfo);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const updateShopInfo = async (info: Partial<ShopInfo>) => {
    if (!currentUser) {
      await alert({
        title: 'Lỗi',
        message: 'Bạn cần đăng nhập để cập nhật thông tin cửa hàng.',
        variant: 'danger',
      });
      return;
    }

    try {
      const shopInfoRef = doc(db, 'shopInfo', currentUser.uid);
      const currentInfo = shopInfo || defaultShopInfo;
      const updatedInfo = { ...currentInfo, ...info };
      
      await setDoc(shopInfoRef, updatedInfo, { merge: true });
      
      await alert({
        title: 'Thành công',
        message: 'Cập nhật thông tin cửa hàng thành công!',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error updating shop info:', error);
      
      let errorMessage = 'Không thể cập nhật thông tin cửa hàng. Vui lòng thử lại.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Bạn không có quyền cập nhật. Vui lòng kiểm tra Firestore rules trong Firebase Console. Xem file FIRESTORE_SETUP.md để biết cách cấu hình.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Firestore hiện không khả dụng. Vui lòng kiểm tra kết nối internet và thử lại.';
      }
      
      await alert({
        title: 'Lỗi',
        message: errorMessage,
        variant: 'danger',
      });
      throw error;
    }
  };

  const value: ShopInfoContextType = {
    shopInfo: shopInfo || defaultShopInfo,
    loading,
    updateShopInfo,
  };

  return (
    <ShopInfoContext.Provider value={value}>
      {children}
      <AlertComponent />
    </ShopInfoContext.Provider>
  );
}

