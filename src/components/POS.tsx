import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Search, Plus, Minus, Trash2, ShoppingCart, Filter, ArrowUpDown, X, CreditCard, Wallet, Building2, User, Tag, Ticket, Layers, QrCode, RefreshCw } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { InvoiceReceipt } from './InvoiceReceipt';
import { useAlert } from './AlertDialog';
import { useProducts, Product } from '../hooks/useProducts';
import { usePromotions } from '../hooks/usePromotions';
import { useVouchers } from '../hooks/useVouchers';
import { useCustomers } from '../hooks/useCustomers';
import { useInvoices } from '../hooks/useInvoices';
import { useShopInfo, BankAccount } from '../contexts/ShopInfoContext';

interface CartItem extends Product {
  quantity: number;
}

interface Cart {
  id: string;
  items: CartItem[];
  voucherCode: string;
  discount: number;
  promotionDiscount: number; // Giảm giá từ khuyến mãi
  voucherDiscount: number; // Giảm giá từ voucher
  customerName: string;
  selectedCustomerId: string;
  appliedPromotions: string[];
}

export function POS() {
  const { alert, AlertComponent } = useAlert();
  
  // Firestore hooks
  const { products, loading: productsLoading, updateProduct } = useProducts();
  const { promotions, usePromotion } = usePromotions();
  const { vouchers, useVoucher } = useVouchers();
  const { customers, addCustomer } = useCustomers();
  const { addInvoice, invoices } = useInvoices();
  const { shopInfo, updateShopInfo } = useShopInfo();
  
  // Multiple carts management - Load from localStorage
  const loadCartsFromStorage = (): { carts: Cart[], currentCartId: string } => {
    try {
      const savedCarts = localStorage.getItem('pos_carts');
      const savedCurrentCartId = localStorage.getItem('pos_currentCartId');
      
      if (savedCarts && savedCurrentCartId) {
        const parsedCarts = JSON.parse(savedCarts);
        return {
          carts: parsedCarts,
          currentCartId: savedCurrentCartId
        };
      }
    } catch (error) {
      console.error('Error loading carts from localStorage:', error);
    }
    
    // Default: create new cart
    const initialCartId = `cart-${Date.now()}`;
    return {
      carts: [{
        id: initialCartId,
        items: [],
        voucherCode: '',
        discount: 0,
        promotionDiscount: 0,
        voucherDiscount: 0,
        customerName: '',
        selectedCustomerId: '',
        appliedPromotions: [],
      }],
      currentCartId: initialCartId
    };
  };

  const { carts: initialCarts, currentCartId: initialCurrentCartId } = loadCartsFromStorage();
  const [carts, setCarts] = useState<Cart[]>(initialCarts);
  const [currentCartId, setCurrentCartId] = useState<string>(initialCurrentCartId);

  // Save carts to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('pos_carts', JSON.stringify(carts));
      localStorage.setItem('pos_currentCartId', currentCartId);
    } catch (error) {
      console.error('Error saving carts to localStorage:', error);
    }
  }, [carts, currentCartId]);

  // Validate and clean up cart items when products load
  useEffect(() => {
    if (products.length > 0 && carts.length > 0) {
      const productIds = new Set(products.map(p => p.id));
      let hasInvalidItems = false;
      
      const cleanedCarts = carts.map(cart => {
        const validItems = cart.items.filter(item => productIds.has(item.id));
        if (validItems.length !== cart.items.length) {
          hasInvalidItems = true;
        }
        return {
          ...cart,
          items: validItems
        };
      });

      if (hasInvalidItems) {
        setCarts(cleanedCarts);
      }
    }
  }, [products]);

  // Get current cart
  const currentCart = useMemo(() => {
    return carts.find(c => c.id === currentCartId) || carts[0];
  }, [carts, currentCartId]);

  // Extract current cart data for easier access
  const cart = currentCart?.items || [];
  const voucherCode = currentCart?.voucherCode || '';
  const discount = currentCart?.discount || 0;
  const promotionDiscount = currentCart?.promotionDiscount || 0;
  const voucherDiscount = currentCart?.voucherDiscount || 0;
  const customerName = currentCart?.customerName || '';
  const selectedCustomerId = currentCart?.selectedCustomerId || '';
  const appliedPromotions = currentCart?.appliedPromotions || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'stock'>('name');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [banksList, setBanksList] = useState<any[]>([]);
  const [tempInvoiceId, setTempInvoiceId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  
  // Load banks list from API
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('https://qr.sepay.vn/banks.json');
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          setBanksList(data.data);
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
      }
    };
    fetchBanks();
  }, []);
  
  // Get default bank account
  const defaultBankAccount = useMemo(() => {
    if (!shopInfo?.bankAccounts || !Array.isArray(shopInfo.bankAccounts)) return null;
    return shopInfo.bankAccounts.find(b => b.isDefault) || shopInfo.bankAccounts[0] || null;
  }, [shopInfo]);
  
  // Initialize selected bank account when payment method changes
  useEffect(() => {
    if (paymentMethod === 'transfer') {
      // Nếu chưa có selectedBankAccount hoặc selectedBankAccount không còn trong danh sách, dùng default
      if (defaultBankAccount) {
        const isSelectedAccountValid = selectedBankAccount && 
          shopInfo?.bankAccounts?.some(acc => acc.id === selectedBankAccount.id);
        if (!isSelectedAccountValid) {
          setSelectedBankAccount(defaultBankAccount);
        }
      }
    } else if (paymentMethod === 'cash') {
      setSelectedBankAccount(null);
    }
  }, [paymentMethod, defaultBankAccount, selectedBankAccount, shopInfo]);
  
  // Khi dialog mở, đảm bảo có selectedBankAccount nếu paymentMethod là transfer
  useEffect(() => {
    if (isPaymentDialogOpen && paymentMethod === 'transfer' && defaultBankAccount && !selectedBankAccount) {
      setSelectedBankAccount(defaultBankAccount);
    }
  }, [isPaymentDialogOpen, paymentMethod, defaultBankAccount, selectedBankAccount]);

  // Get bank icon URL
  const getBankIconUrl = (bankName: string): string => {
    const bank = banksList.find(b => b.name === bankName);
    if (bank && bank.short_name) {
      return `https://img.vietqr.io/${bank.short_name}/compact.png`;
    }
    return '';
  };

  // Get bank code (short_name) from bank name - fetch from API
  const getBankCode = async (bankName: string): Promise<string> => {
    try {
      const response = await fetch('https://qr.sepay.vn/banks.json');
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        const bank = data.data.find((b: any) => 
          b.name.toLowerCase() === bankName.toLowerCase() || 
          b.short_name.toLowerCase() === bankName.toLowerCase() ||
          b.name.toLowerCase().includes(bankName.toLowerCase()) ||
          bankName.toLowerCase().includes(b.short_name.toLowerCase())
        );
        if (bank) {
          return bank.short_name;
        }
      }
    } catch (error) {
      console.error('Error fetching bank code:', error);
    }
    // Fallback: return uppercase bank name without spaces
    return bankName.toUpperCase().replace(/\s+/g, '');
  };

  // Get QR code URL with amount
  const getQRCodeUrl = (account: BankAccount, amount: number, invoiceId?: string): string => {
    // Use bankCode if available, otherwise find from banks list
    let bankCode = account.bankCode;
    if (!bankCode || bankCode === '') {
      // Try to find from banks list
      const bank = banksList.find(b => b.name === account.bankName);
      if (bank && bank.short_name) {
        bankCode = bank.short_name;
        console.log('Found bank code from API:', account.bankName, '->', bankCode);
      } else {
        console.error('Bank code not found for:', account.bankName);
        console.log('Available banks:', banksList.map(b => ({ name: b.name, short_name: b.short_name })));
        // Don't use fallback, return error URL or empty
        return '';
      }
    }
    // URL parameters: acc (số tài khoản), bank (code ngân hàng), amount (số tiền), des (nội dung)
    // Không encode số tài khoản và bank code, chỉ encode description
    const accountNumber = account.accountNumber.trim();
    
    // Format nội dung: "Hóa đơn + <Mã hóa đơn>: THANH TOAN HOA QUA + <Tên shop>"
    const shopName = shopInfo?.name || 'Shop';
    // Sử dụng invoiceId nếu có (đã tạo), nếu không dùng tempInvoiceId (preview)
    const invoiceCode = invoiceId || tempInvoiceId || `HD${String((shopInfo?.invoiceCounter || 0) + 1).padStart(6, '0')}`;
    const description = `Hóa đơn ${invoiceCode}: THANH TOAN HOA QUA ${shopName}`;
    
    const url = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=${amount}&des=${encodeURIComponent(description)}`;
    console.log('QR Code URL:', url, { account, bankCode, amount, description, invoiceId });
    return url;
  };

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = products.map(p => p.category);
    return Array.from(new Set(cats));
  }, [products]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'stock':
        return b.stock - a.stock;
      default:
        return 0;
    }
  });

  // Calculate subtotal
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // Update current cart when cart data changes
  const updateCurrentCart = (updates: Partial<Cart>) => {
    setCarts(prevCarts => 
      prevCarts.map(c => 
        c.id === currentCartId ? { ...c, ...updates } : c
      )
    );
  };

  // Create new cart
  const createNewCart = async () => {
    if (carts.length >= 5) {
      await alert({
        title: 'Thông báo',
        message: 'Bạn chỉ có thể tạo tối đa 5 giỏ hàng!',
        variant: 'warning',
      });
      return;
    }
    const newCartId = `cart-${Date.now()}`;
    const newCart: Cart = {
      id: newCartId,
      items: [],
      voucherCode: '',
      discount: 0,
      promotionDiscount: 0,
      voucherDiscount: 0,
      customerName: '',
      selectedCustomerId: '',
      appliedPromotions: [],
    };
    setCarts(prev => [...prev, newCart]);
    setCurrentCartId(newCartId);
  };

  // Delete cart
  const deleteCart = async (cartId: string) => {
    if (carts.length <= 1) {
      await alert({
        title: 'Thông báo',
        message: 'Phải có ít nhất 1 giỏ hàng!',
        variant: 'warning',
      });
      return;
    }
    setCarts(prev => {
      const filtered = prev.filter(c => c.id !== cartId);
      // If deleting current cart, switch to first available cart
      if (cartId === currentCartId && filtered.length > 0) {
        setCurrentCartId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Switch to a different cart
  const switchCart = (cartId: string) => {
    setCurrentCartId(cartId);
  };

  // Auto-apply promotions
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const cartProductIds = cart.map(item => item.id);
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    
    // Find applicable promotions
    const applicablePromotions = promotions.filter(promo => {
      // Check status
      if (promo.status !== 'active') return false;
      
      // Check date range
      if (promo.startDate > today || promo.endDate < today) return false;
      
      // Check quantity (nếu quantity > 0 thì phải còn lượt)
      if (promo.quantity > 0 && promo.used >= promo.quantity) return false;
      
      // Check minimum purchase
      if (promo.minPurchase > 0 && subtotal < promo.minPurchase) return false;
      
      // Check product eligibility
      if (promo.productIds !== null) {
        // Promotion applies to specific products
        const hasEligibleProduct = cartProductIds.some(id => promo.productIds!.includes(id));
        if (!hasEligibleProduct) return false;
      }
      
      // Check customer eligibility
      if (promo.customerIds !== null && selectedCustomer) {
        // Promotion applies to specific customers
        if (!promo.customerIds.includes(selectedCustomer.id)) return false;
      }
      
      // Check if customer has already used this promotion (mỗi khách hàng chỉ dùng 1 lần)
      if (selectedCustomer) {
        const hasUsedPromotion = invoices.some(inv => 
          inv.customerId === selectedCustomer.id && 
          inv.promotionIds && 
          inv.promotionIds.includes(promo.id)
        );
        if (hasUsedPromotion) return false;
      }
      
      return true;
    });

    // Calculate total discount from promotions
    let promotionDiscount = 0;
    const appliedPromoIds: string[] = [];
    
    applicablePromotions.forEach(promo => {
      appliedPromoIds.push(promo.id);
      if (promo.type === 'percent') {
        promotionDiscount += subtotal * (promo.value / 100);
      } else if (promo.type === 'fixed') {
        promotionDiscount += promo.value;
      }
      // buy_get type would need special handling
    });

    // Apply voucher discount if any
    let voucherDiscount = 0;
    const appliedVoucher = vouchers.find(v => 
      v.code.toUpperCase() === voucherCode.toUpperCase() && 
      v.status === 'active' &&
      v.used < v.quantity
    );
    
    if (appliedVoucher) {
      const today = new Date().toISOString().split('T')[0];
      // Check voucher eligibility
      if (appliedVoucher.startDate <= today && appliedVoucher.endDate >= today) {
        // Check minimum purchase
        if (subtotal >= appliedVoucher.minPurchase) {
          // Check product eligibility
          let productEligible = true;
          if (appliedVoucher.productIds !== null) {
            productEligible = cartProductIds.some(id => appliedVoucher.productIds!.includes(id));
          }
          
          // Check customer eligibility
          let customerEligible = true;
          if (appliedVoucher.customerIds !== null && selectedCustomer) {
            customerEligible = appliedVoucher.customerIds.includes(selectedCustomer.id);
          } else if (appliedVoucher.customerIds !== null && !selectedCustomer) {
            customerEligible = false;
          }
          
          // Check if customer has already used this voucher (mỗi khách hàng chỉ dùng 1 lần)
          if (selectedCustomer && customerEligible) {
            const hasUsedVoucher = invoices.some(inv => 
              inv.customerId === selectedCustomer.id && 
              inv.voucherCode && 
              inv.voucherCode.toUpperCase() === appliedVoucher.code.toUpperCase()
            );
            if (hasUsedVoucher) {
              customerEligible = false;
            }
          }
          
          if (productEligible && customerEligible) {
            if (appliedVoucher.type === 'percent') {
              voucherDiscount = subtotal * (appliedVoucher.value / 100);
              if (appliedVoucher.maxDiscount) {
                voucherDiscount = Math.min(voucherDiscount, appliedVoucher.maxDiscount);
              }
            } else if (appliedVoucher.type === 'fixed') {
              voucherDiscount = Math.min(appliedVoucher.value, subtotal);
            }
          }
        }
      }
    }

    // Total discount is the sum of promotion and voucher discounts
    const totalDiscountAmount = Math.min(promotionDiscount + voucherDiscount, subtotal);
    
    // Update current cart with discount and promotions
    updateCurrentCart({
      discount: totalDiscountAmount > 0 ? totalDiscountAmount : 0,
      promotionDiscount: promotionDiscount > 0 ? promotionDiscount : 0,
      voucherDiscount: voucherDiscount > 0 ? voucherDiscount : 0,
      appliedPromotions: appliedPromoIds,
    });
  }, [cart, subtotal, promotions, vouchers, selectedCustomerId, customers, voucherCode, invoices, currentCartId]);

  const addToCart = async (product: Product) => {
    // Kiểm tra tồn kho
    if (product.stock <= 0) {
      await alert({
        title: 'Thông báo',
        message: 'Sản phẩm đã hết hàng!',
        variant: 'warning',
      });
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    const increment = 1;
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + increment;
      // Kiểm tra tồn kho khi tăng số lượng
      if (newQuantity > product.stock) {
        await alert({
          title: 'Thông báo',
          message: `Số lượng vượt quá tồn kho (${product.stock} ${product.unit})!`,
          variant: 'warning',
        });
        return;
      }
      updateCurrentCart({
        items: cart.map(item =>
        item.id === product.id
            ? { ...item, quantity: newQuantity }
          : item
        ),
      });
    } else {
      updateCurrentCart({
        items: [...cart, { ...product, quantity: 1 }],
      });
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const updatedItems = cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        // Kiểm tra tồn kho
        if (newQuantity > item.stock) {
          return item; // Không cho phép vượt quá tồn kho
        }
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    updateCurrentCart({ items: updatedItems });
  };

  const setQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    const updatedItems = cart.map(item => {
      if (item.id === id) {
        // Kiểm tra tồn kho
        if (quantity > item.stock) {
          return { ...item, quantity: item.stock }; // Giới hạn ở tồn kho
        }
        return { ...item, quantity };
      }
      return item;
    });
    
    updateCurrentCart({ items: updatedItems });
  };

  const removeFromCart = (id: string) => {
    updateCurrentCart({
      items: cart.filter(item => item.id !== id),
    });
  };

  const applyVoucher = async () => {
    if (!voucherCode) return;
    
    const appliedVoucher = vouchers.find(v => 
      v.code.toUpperCase() === voucherCode.toUpperCase()
    );
    
    if (!appliedVoucher) {
      await alert({
        title: 'Lỗi',
        message: 'Mã voucher không tồn tại!',
        variant: 'danger',
      });
      updateCurrentCart({ voucherCode: '' });
      return;
    }
    
    if (appliedVoucher.status !== 'active') {
      await alert({
        title: 'Lỗi',
        message: 'Mã voucher không còn hiệu lực!',
        variant: 'danger',
      });
      updateCurrentCart({ voucherCode: '' });
      return;
    }
    
    if (appliedVoucher.used >= appliedVoucher.quantity) {
      await alert({
        title: 'Lỗi',
        message: 'Mã voucher đã hết lượt sử dụng!',
        variant: 'danger',
      });
      updateCurrentCart({ voucherCode: '' });
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (appliedVoucher.startDate > today || appliedVoucher.endDate < today) {
      await alert({
        title: 'Lỗi',
        message: 'Mã voucher chưa đến thời gian hoặc đã hết hạn!',
        variant: 'danger',
      });
      updateCurrentCart({ voucherCode: '' });
      return;
    }
    
    if (subtotal < appliedVoucher.minPurchase) {
      await alert({
        title: 'Lỗi',
        message: `Đơn hàng tối thiểu ${appliedVoucher.minPurchase.toLocaleString('vi-VN')}₫ để sử dụng voucher này!`,
        variant: 'warning',
      });
      return;
    }
    
    // Check product eligibility
    const cartProductIds = cart.map(item => item.id);
    if (appliedVoucher.productIds !== null) {
      const hasEligibleProduct = cartProductIds.some(id => appliedVoucher.productIds!.includes(id));
      if (!hasEligibleProduct) {
        await alert({
          title: 'Lỗi',
          message: 'Voucher này không áp dụng cho sản phẩm trong giỏ hàng!',
          variant: 'warning',
        });
        return;
      }
    }
    
    // Check customer eligibility
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    if (appliedVoucher.customerIds !== null) {
      if (!selectedCustomer || !appliedVoucher.customerIds.includes(selectedCustomer.id)) {
        await alert({
          title: 'Lỗi',
          message: 'Voucher này không áp dụng cho khách hàng này!',
          variant: 'warning',
        });
        return;
      }
    }
    
    // Check if customer has already used this voucher (mỗi khách hàng chỉ dùng 1 lần)
    if (selectedCustomer) {
      const hasUsedVoucher = invoices.some(inv => 
        inv.customerId === selectedCustomer.id && 
        inv.voucherCode && 
        inv.voucherCode.toUpperCase() === appliedVoucher.code.toUpperCase()
      );
      if (hasUsedVoucher) {
        await alert({
          title: 'Lỗi',
          message: 'Khách hàng này đã sử dụng voucher này rồi. Mỗi khách hàng chỉ được dùng 1 lần!',
          variant: 'warning',
        });
        return;
      }
    }
    
    await alert({
      title: 'Thành công',
      message: 'Áp dụng mã voucher thành công!',
      variant: 'success',
    });
  };

  const discountAmount = discount;
  const total = subtotal - discountAmount;

  // Generate invoice code from counter
  const generateInvoiceCode = (counter: number): string => {
    const paddedNumber = String(counter).padStart(6, '0');
    return `HD${paddedNumber}`;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      await alert({
        title: 'Thông báo',
        message: 'Giỏ hàng trống!',
        variant: 'warning',
      });
      return;
    }
    // Generate invoice code from counter for QR code preview
    const currentCounter = shopInfo?.invoiceCounter || 0;
    const nextCounter = currentCounter + 1;
    const invoiceCode = generateInvoiceCode(nextCounter);
    setTempInvoiceId(invoiceCode);
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (cart.length === 0) {
      return;
    }

    // Kiểm tra tồn kho trước khi thanh toán
    const outOfStockItems = cart.filter(item => item.quantity > item.stock);
    if (outOfStockItems.length > 0) {
      await alert({
        title: 'Lỗi',
        message: `Một số sản phẩm vượt quá tồn kho. Vui lòng kiểm tra lại!`,
        variant: 'warning',
      });
      return;
    }

    try {
      // Nếu có tên khách hàng mới và chưa chọn khách hàng, tạo khách hàng mới
      let finalCustomerId = selectedCustomerId;
      let finalCustomerName = customerName;
      
      if (newCustomerName?.trim() && !selectedCustomerId) {
        try {
          const newCustomerId = await addCustomer({
            name: newCustomerName.trim(),
          });
          finalCustomerId = newCustomerId;
          finalCustomerName = newCustomerName.trim();
          // Cập nhật cart với customer mới
          updateCurrentCart({
            selectedCustomerId: newCustomerId,
            customerName: newCustomerName.trim(),
          });
        } catch (error) {
          console.error('Error creating new customer:', error);
          // Tiếp tục tạo invoice mà không có customer nếu lỗi
        }
      }
      
      // Tạo hóa đơn
      const now = new Date();
      
      // Build invoice data, only include fields that have values (Firestore doesn't accept undefined)
      const invoiceData: any = {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().slice(0, 5),
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
        })),
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
      };
      
      // Add separate discount fields if they have values
      if (promotionDiscount > 0) {
        invoiceData.promotionDiscount = promotionDiscount;
      }
      if (voucherDiscount > 0) {
        invoiceData.voucherDiscount = voucherDiscount;
      }
      
      // Only add optional fields if they have values
      if (finalCustomerName?.trim()) {
        invoiceData.customerName = finalCustomerName.trim();
      }
      if (finalCustomerId) {
        invoiceData.customerId = finalCustomerId;
      }
      
      // Lưu snapshot thông tin voucher (nếu có)
      if (voucherCode?.trim() && voucherDiscount > 0) {
        const appliedVoucher = vouchers.find(v => 
          v.code.toUpperCase() === voucherCode.toUpperCase()
        );
        if (appliedVoucher) {
          invoiceData.voucherCode = voucherCode.trim(); // Giữ lại để backward compatibility
          invoiceData.voucherSnapshot = {
            code: appliedVoucher.code,
            type: appliedVoucher.type,
            value: appliedVoucher.value,
            discountAmount: voucherDiscount,
          };
        }
      }
      
      // Lưu snapshot thông tin promotions (nếu có)
      if (appliedPromotions.length > 0 && promotionDiscount > 0) {
        invoiceData.promotionIds = appliedPromotions; // Giữ lại để backward compatibility
        
        // Tìm lại các promotions đã áp dụng từ danh sách promotions
        const appliedPromoObjects = promotions.filter(promo => appliedPromotions.includes(promo.id));
        
        // Tính toán discount amount cho từng promotion dựa trên subtotal ban đầu
        const promotionSnapshots: Array<{ id: string; name: string; type: string; value: number; discountAmount: number }> = [];
        const individualDiscounts: number[] = [];
        let totalCalculatedDiscount = 0;
        
        // Tính discount cho từng promotion dựa trên subtotal ban đầu
        appliedPromoObjects.forEach(promo => {
          let promoDiscount = 0;
          if (promo.type === 'percent') {
            promoDiscount = subtotal * (promo.value / 100);
          } else if (promo.type === 'fixed') {
            promoDiscount = promo.value;
          }
          individualDiscounts.push(promoDiscount);
          totalCalculatedDiscount += promoDiscount;
        });
        
        // Nếu tổng discount tính được khác với promotionDiscount thực tế, normalize
        // (có thể do giới hạn hoặc logic đặc biệt)
        const normalizeFactor = totalCalculatedDiscount > 0 
          ? Math.min(1, promotionDiscount / totalCalculatedDiscount) 
          : 1;
        
        // Tạo snapshots với discount đã normalize
        appliedPromoObjects.forEach((promo, index) => {
          const normalizedDiscount = individualDiscounts[index] * normalizeFactor;
          promotionSnapshots.push({
            id: promo.id,
            name: promo.name,
            type: promo.type,
            value: promo.value,
            discountAmount: Math.round(normalizedDiscount * 100) / 100, // Làm tròn 2 chữ số
          });
        });
        
        if (promotionSnapshots.length > 0) {
          invoiceData.promotionSnapshots = promotionSnapshots;
        }
      }
      
      // Lưu snapshot thông tin bank account (nếu thanh toán chuyển khoản)
      if (paymentMethod === 'transfer' && selectedBankAccount) {
        // Get bank code from account or find from banks list
        let bankCode = selectedBankAccount.bankCode;
        if (!bankCode || bankCode === '') {
          const bank = banksList.find(b => b.name === selectedBankAccount.bankName);
          bankCode = bank?.short_name || '';
        }
        // Format nội dung QR code đã sử dụng (sẽ cập nhật với invoiceCode thực tế sau)
        const shopName = shopInfo?.name || 'Shop';
        // Tạm thời dùng tempInvoiceId, sẽ cập nhật với invoiceCode thực tế sau
        const invoiceCodeForQR = tempInvoiceId || `HD${String((shopInfo?.invoiceCounter || 0) + 1).padStart(6, '0')}`;
        const qrDescription = `Hóa đơn ${invoiceCodeForQR}: THANH TOAN HOA QUA ${shopName}`;
        invoiceData.bankAccountSnapshot = {
          id: selectedBankAccount.id,
          bankName: selectedBankAccount.bankName,
          accountNumber: selectedBankAccount.accountNumber,
          accountHolder: selectedBankAccount.accountHolder,
          bankCode: bankCode,
          qrDescription: qrDescription, // Lưu nội dung QR code đã sử dụng
        };
      }

      // Generate invoice code và tăng counter
      const currentCounter = shopInfo?.invoiceCounter || 0;
      const nextCounter = currentCounter + 1;
      const invoiceCode = generateInvoiceCode(nextCounter);
      
      // Thêm invoiceCode vào invoice data
      invoiceData.invoiceCode = invoiceCode;
      console.log('Creating invoice with code:', invoiceCode, 'Counter:', nextCounter);
      
      // Cập nhật qrDescription với invoiceCode thực tế nếu có bankAccountSnapshot
      if (invoiceData.bankAccountSnapshot && paymentMethod === 'transfer') {
        const shopName = shopInfo?.name || 'Shop';
        invoiceData.bankAccountSnapshot.qrDescription = `Hóa đơn ${invoiceCode}: THANH TOAN HOA QUA ${shopName}`;
      }

      // Lưu hóa đơn vào Firestore
      let invoiceId: string;
      try {
        console.log('Invoice data before saving:', invoiceData);
        invoiceId = await addInvoice(invoiceData);
        console.log('Invoice created with ID:', invoiceId, 'Invoice Code:', invoiceCode);
        
        // Cập nhật counter trong shopInfo
        try {
          await updateShopInfo({ invoiceCounter: nextCounter });
        } catch (counterError) {
          console.error('Error updating invoice counter:', counterError);
          // Không throw error vì invoice đã được tạo thành công
        }
        
        // Clear temp invoice ID after successful creation
        setTempInvoiceId('');
      } catch (invoiceError: any) {
        console.error('Error adding invoice:', invoiceError);
        let errorMessage = 'Không thể lưu hóa đơn vào Firestore.';
        if (invoiceError.code === 'permission-denied') {
          errorMessage = 'Bạn không có quyền tạo hóa đơn. Vui lòng kiểm tra Firestore security rules.';
        } else if (invoiceError.message) {
          errorMessage = `Lỗi: ${invoiceError.message}`;
        }
        await alert({
          title: 'Lỗi',
          message: errorMessage,
          variant: 'danger',
        });
        return;
      }
      
      // Cập nhật số lượng tồn kho
      const stockUpdateErrors: string[] = [];
      const stockUpdates = cart.map(item => {
        const newStock = item.stock - item.quantity;
        return { id: item.id, stock: Math.max(0, newStock), name: item.name };
      });
      
      for (const update of stockUpdates) {
        try {
          await updateProduct(update.id, { stock: update.stock });
        } catch (stockError: any) {
          console.error(`Error updating stock for ${update.name}:`, stockError);
          stockUpdateErrors.push(update.name);
        }
      }

      if (stockUpdateErrors.length > 0) {
        console.warn('Some products stock could not be updated:', stockUpdateErrors);
        // Không block việc tạo hóa đơn nếu chỉ lỗi cập nhật tồn kho
      }

      // Tăng số lượng đã sử dụng của promotions nếu có
      for (const promoId of appliedPromotions) {
        try {
          await usePromotion(promoId);
        } catch (promoError: any) {
          console.error(`Error updating promotion usage for ${promoId}:`, promoError);
          // Không block việc tạo hóa đơn nếu chỉ lỗi cập nhật promotion
        }
      }

      // Tăng số lượng đã sử dụng của voucher nếu có
      if (voucherCode) {
        const appliedVoucher = vouchers.find(v => 
          v.code.toUpperCase() === voucherCode.toUpperCase()
        );
        if (appliedVoucher) {
          try {
            await useVoucher(appliedVoucher.id);
          } catch (voucherError: any) {
            console.error('Error updating voucher usage:', voucherError);
            // Không block việc tạo hóa đơn nếu chỉ lỗi cập nhật voucher
          }
        }
      }

      // Tạo invoice object để hiển thị receipt
      // invoiceCode đã có trong invoiceData (được thêm ở dòng 756)
      const invoice = {
        id: invoiceId,
        invoiceCode: invoiceCode, // Đảm bảo invoiceCode được thêm vào (có thể đã có trong invoiceData nhưng đảm bảo chắc chắn)
        ...invoiceData,
        items: invoiceData.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      console.log('Setting current invoice:', invoice, 'Invoice Code:', invoiceCode, 'InvoiceData:', invoiceData);
      setCurrentInvoice(invoice);
      setIsPaymentDialogOpen(false);
      setIsReceiptOpen(true);
      
      // Reset current cart after successful payment, but keep customer selection for next invoice
      updateCurrentCart({
        items: [],
        voucherCode: '',
        discount: 0,
        promotionDiscount: 0,
        voucherDiscount: 0,
        appliedPromotions: [],
        // Keep customerName and selectedCustomerId for next invoice
      });
      setPaymentMethod('cash');
      setNewCustomerName(''); // Reset new customer name
    } catch (error: any) {
      console.error('Error in handleConfirmPayment:', error);
      let errorMessage = 'Không thể tạo hóa đơn. Vui lòng thử lại.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Bạn không có quyền tạo hóa đơn. Vui lòng kiểm tra Firestore security rules.';
      } else if (error.message) {
        errorMessage = `Lỗi: ${error.message}`;
      }
      
      await alert({
        title: 'Lỗi',
        message: errorMessage,
        variant: 'danger',
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
        <h1 className="text-gray-900">Bán Hàng</h1>
          {/* Cart Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {carts.map((cartItem, index) => (
                <button
                  key={cartItem.id}
                  onClick={() => switchCart(cartItem.id)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors relative ${
                    currentCartId === cartItem.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={`Giỏ hàng ${index + 1}${cartItem.items.length > 0 ? ` (${cartItem.items.length} sản phẩm)` : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Layers size={14} />
                    <span>Giỏ {index + 1}</span>
                    {cartItem.items.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {cartItem.items.length}
                      </Badge>
                    )}
                    {carts.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCart(cartItem.id);
                        }}
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Xóa giỏ hàng"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {carts.length < 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={createNewCart}
                className="gap-2"
                title="Tạo giỏ hàng mới"
              >
                <Plus size={16} />
                Thêm giỏ
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters and Sort */}
            <div className="flex gap-3 items-center">
              {/* Category Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter size={16} />
                    Danh mục
                    {selectedCategories.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {selectedCategories.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Lọc theo danh mục</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={category}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories([...selectedCategories, category]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== category));
                              }
                            }}
                          />
                          <Label htmlFor={category} className="text-sm font-normal cursor-pointer">
                            {category}
                          </Label>
          </div>
                      ))}
                    </div>
                    {selectedCategories.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setSelectedCategories([])}
                      >
                        <X size={14} className="mr-2" />
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px] gap-2">
                  <ArrowUpDown size={16} />
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Tên A-Z</SelectItem>
                  <SelectItem value="price-asc">Giá tăng dần</SelectItem>
                  <SelectItem value="price-desc">Giá giảm dần</SelectItem>
                  <SelectItem value="stock">Tồn kho</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear filters */}
              {(selectedCategories.length > 0 || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSearchTerm('');
                  }}
                  className="gap-2"
                >
                  <X size={16} />
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          </div>

          {productsLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Đang tải sản phẩm...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">Không tìm thấy sản phẩm nào</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 5;
                return (
              <Card
                key={product.id}
                    className={`cursor-pointer hover:shadow-lg transition-shadow relative ${
                      isOutOfStock ? 'opacity-50 grayscale' : ''
                    }`}
                    onClick={() => !isOutOfStock && addToCart(product)}
              >
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-gray-900 bg-opacity-60 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                        <Badge variant="destructive" className="text-base px-4 py-2 font-semibold">
                          Hết hàng
                        </Badge>
                      </div>
                    )}
                    <div className="aspect-square overflow-hidden relative">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                      {isLowStock && !isOutOfStock && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="destructive" className="text-xs">
                            Sắp hết
                          </Badge>
                        </div>
                      )}
                </div>
                <div className="p-4">
                      <p className="text-gray-900 mb-1 font-medium">{product.name}</p>
                  <div className="flex justify-between items-center">
                        <p className="text-green-600 font-semibold">{product.price.toLocaleString('vi-VN')}₫/{product.unit}</p>
                        <Badge 
                          variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'} 
                          className="text-xs"
                        >
                      {product.stock} {product.unit}
                    </Badge>
                  </div>
                </div>
              </Card>
                );
              })}
          </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="w-[420px] bg-white border-l flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart size={24} />
              <h2 className="text-gray-900">Giỏ Hàng</h2>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 mt-12">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                <p>Chưa có sản phẩm nào</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <Card key={item.id} className="p-4">
                    <div className="flex gap-3">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-gray-900 mb-1 font-medium">{item.name}</p>
                        <p className="text-gray-600 text-sm">{item.price.toLocaleString('vi-VN')}₫/{item.unit}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Tồn kho: {item.stock} {item.unit}
                          {item.quantity > item.stock && (
                            <span className="text-red-500 ml-1">(Vượt quá tồn kho!)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateQuantity(item.id, -1);
                            }}
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="w-12 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateQuantity(item.id, 1);
                            }}
                          >
                            <Plus size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto text-red-500"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="border-t p-6 space-y-4">
            {/* Customer Selection */}
            <div>
              <Label className="mb-2 block text-sm font-semibold">Khách hàng</Label>
              <Select 
                value={selectedCustomerId || '__none__'} 
                onValueChange={(value) => {
                  if (value === '__none__') {
                    updateCurrentCart({
                      selectedCustomerId: '',
                      customerName: '',
                    });
                    setNewCustomerName(''); // Reset new customer name when deselecting
                  } else {
                    const customer = customers.find(c => c.id === value);
                    updateCurrentCart({
                      selectedCustomerId: value,
                      customerName: customer?.name || '',
                    });
                    setNewCustomerName(''); // Reset new customer name when selecting existing
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <User size={16} className="mr-2" />
                  <SelectValue placeholder="Chọn khách hàng (tùy chọn)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Không chọn</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex flex-col">
                        <span>{customer.name}</span>
                        {customer.phone && (
                          <span className="text-xs text-gray-500">{customer.phone}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomerId && (() => {
                const customer = customers.find(c => c.id === selectedCustomerId);
                if (customer) {
                  return (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <User size={14} className="text-blue-600" />
                        <span className="font-medium text-blue-900">{customer.name}</span>
                        {customer.phone && (
                          <span className="text-blue-600">• {customer.phone}</span>
                        )}
                      </div>
                      {customer.email && (
                        <p className="text-xs text-blue-600 mt-1">{customer.email}</p>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
              {!selectedCustomerId && (
                <div className="mt-2">
                  <Label className="mb-2 block text-xs text-gray-600">Hoặc nhập tên khách hàng mới</Label>
                  <Input
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nhập tên khách hàng mới"
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Applied Promotions */}
            {appliedPromotions.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="text-green-600" size={16} />
                  <span className="text-sm font-semibold text-green-800">Khuyến mãi đang áp dụng:</span>
                </div>
                <div className="space-y-1">
                  {appliedPromotions.map(promoId => {
                    const promo = promotions.find(p => p.id === promoId);
                    if (!promo) return null;
                    return (
                      <div key={promoId} className="text-xs text-green-700">
                        • {promo.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Applied Voucher */}
            {voucherCode && (() => {
              const appliedVoucher = vouchers.find(v => 
                v.code.toUpperCase() === voucherCode.toUpperCase() && 
                v.status === 'active' &&
                v.used < v.quantity
              );
              if (appliedVoucher) {
                const today = new Date().toISOString().split('T')[0];
                const cartProductIds = cart.map(item => item.id);
                const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
                let isEligible = true;
                
                if (appliedVoucher.startDate <= today && appliedVoucher.endDate >= today) {
                  if (subtotal >= appliedVoucher.minPurchase) {
                    if (appliedVoucher.productIds !== null) {
                      isEligible = cartProductIds.some(id => appliedVoucher.productIds!.includes(id));
                    }
                    if (isEligible && appliedVoucher.customerIds !== null) {
                      if (!selectedCustomer || !appliedVoucher.customerIds.includes(selectedCustomer.id)) {
                        isEligible = false;
                      }
                    }
                  } else {
                    isEligible = false;
                  }
                } else {
                  isEligible = false;
                }
                
                if (isEligible) {
                  return (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="text-purple-600" size={16} />
                        <span className="text-sm font-semibold text-purple-800">
                          Voucher: <code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{appliedVoucher.code}</code>
                        </span>
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}

            <div className="flex gap-2">
              <Input
                placeholder="Mã voucher"
                value={voucherCode}
                onChange={(e) => updateCurrentCart({ voucherCode: e.target.value })}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    applyVoucher();
                  }
                }}
              />
              <Button onClick={applyVoucher} variant="outline">
                Áp dụng
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính:</span>
                <span>{subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              {promotionDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm khuyến mãi:</span>
                  <span>-{promotionDiscount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm mã giảm giá:</span>
                  <span>-{voucherDiscount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              {discountAmount > 0 && (promotionDiscount === 0 && voucherDiscount === 0) && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá:</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between text-gray-900 pt-2 border-t">
                <span>Tổng cộng:</span>
                <span>{total.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>

            <Button onClick={handleCheckout} className="w-full" size="lg">
              Thanh Toán
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="!max-w-[95vw] !w-auto !sm:max-w-[95vw] max-h-[90vh] overflow-y-auto" style={{ width: 'auto', maxWidth: '95vw' }}>
          <DialogHeader>
            <DialogTitle>Thanh Toán</DialogTitle>
          </DialogHeader>
          <div className="flex gap-6 py-4">
            {/* Left Column - Order Details */}
            <div className="flex-1 space-y-4 min-w-0">
              {/* Order Details */}
              <div className="space-y-4">
                <Label className="block font-semibold">Chi tiết đơn hàng</Label>
                
                {/* Voucher & Promotions */}
                {(voucherCode || appliedPromotions.length > 0) && (
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 border border-gray-200">
                    {voucherCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Mã giảm giá:</span>
                        <code className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-mono text-sm font-semibold">
                          {voucherCode}
                        </code>
                      </div>
                    )}
                    {appliedPromotions.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600 block mb-2">Khuyến mãi:</span>
                        <div className="flex flex-wrap gap-2">
                          {appliedPromotions.map(promoId => {
                            const promo = promotions.find(p => p.id === promoId);
                            return promo ? (
                              <Badge key={promoId} variant="secondary" className="gap-1">
                                <Tag size={12} />
                                {promo.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Products Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-gray-50 z-10">
                        <TableRow>
                          <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600 w-12">STT</TableHead>
                          <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600">Sản phẩm</TableHead>
                          <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Số lượng</TableHead>
                          <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Đơn giá</TableHead>
                          <TableHead className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Tổng giá</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((item, index) => (
                          <TableRow key={item.id} className="border-b border-gray-100">
                            <TableCell className="px-3 py-2 text-sm text-gray-600">{index + 1}</TableCell>
                            <TableCell className="px-3 py-2">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                                {item.unit && (
                                  <p className="text-xs text-gray-500 mt-0.5">Đơn vị: {item.unit}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-sm text-gray-900 text-right">
                              {item.quantity} {item.unit}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-sm text-gray-900 text-right">
                              {item.price.toLocaleString('vi-VN')}₫
                            </TableCell>
                            <TableCell className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                              {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column - QR Code */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                paymentMethod === 'transfer' && selectedBankAccount 
                  ? 'w-[280px] opacity-100' 
                  : 'w-0 opacity-0'
              } flex-shrink-0 flex flex-col items-center justify-center`}
            >
              {paymentMethod === 'transfer' && selectedBankAccount && (
                <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg w-full">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-semibold text-purple-900">Mã QR Thanh Toán</Label>
                    {shopInfo?.bankAccounts && shopInfo.bankAccounts.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsQRDialogOpen(true)}
                        className="text-xs"
                      >
                        <RefreshCw size={12} className="mr-1" />
                        Đổi QR
                      </Button>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="bg-white p-3 rounded-lg border-4 border-purple-400 shadow-lg inline-block">
                      {(() => {
                        const qrUrl = getQRCodeUrl(selectedBankAccount, total, tempInvoiceId);
                        return qrUrl ? (
                          <img
                            src={qrUrl}
                            alt="QR Code"
                            className="w-60 h-60 border-2 border-gray-300 rounded"
                            onError={(e) => {
                              console.error('QR Code image failed to load');
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-60 h-60 flex items-center justify-center text-red-500 text-xs p-2 text-center border-2 border-red-300 rounded">
                            Không thể tạo QR code. Vui lòng kiểm tra lại thông tin ngân hàng trong cài đặt.
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2 justify-center">
                        {getBankIconUrl(selectedBankAccount.bankName) && (
                          <img 
                            src={getBankIconUrl(selectedBankAccount.bankName)} 
                            alt={selectedBankAccount.bankName}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <p className="font-medium text-purple-900">{selectedBankAccount.bankName}</p>
                      </div>
                      <p className="text-purple-700 font-mono">{selectedBankAccount.accountNumber}</p>
                      <p className="text-purple-600">{selectedBankAccount.accountHolder}</p>
                      <p className="text-purple-800 font-bold mt-2">Số tiền: {total.toLocaleString('vi-VN')}₫</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Customer, Payment Method, Summary */}
            <div className="w-[400px] space-y-6 flex-shrink-0">
            {/* Customer Selection */}
            <div>
              <Label className="mb-2 block font-semibold">Khách hàng</Label>
              {selectedCustomerId ? (() => {
                const customer = customers.find(c => c.id === selectedCustomerId);
                if (customer) {
                  return (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-blue-600" />
                            <span className="font-medium text-blue-900">{customer.name}</span>
                          </div>
                          {customer.phone && (
                            <p className="text-sm text-blue-600 mt-1">{customer.phone}</p>
                          )}
                          {customer.email && (
                            <p className="text-xs text-blue-500 mt-1">{customer.email}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateCurrentCart({
                              selectedCustomerId: '',
                              customerName: '',
                            });
                          }}
                        >
                          <X size={16} />
                        </Button>
      </div>
                    </div>
                  );
                }
                return null;
              })() : customerName ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-600" />
                        <span className="font-medium">{customerName}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Khách hàng mới</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCurrentCart({ customerName: '' })}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Select 
                    value={selectedCustomerId || '__none__'} 
                    onValueChange={(value) => {
                      if (value === '__none__') {
                        updateCurrentCart({
                          selectedCustomerId: '',
                          customerName: '',
                        });
                      } else {
                        const customer = customers.find(c => c.id === value);
                        updateCurrentCart({
                          selectedCustomerId: value,
                          customerName: customer?.name || '',
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <User size={16} className="mr-2" />
                      <SelectValue placeholder="Chọn khách hàng từ danh sách" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Không chọn</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex flex-col">
                            <span>{customer.name}</span>
                            {customer.phone && (
                              <span className="text-xs text-gray-500">{customer.phone}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative mt-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Hoặc</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="mb-2 block text-xs text-gray-600">Nhập tên khách hàng mới</Label>
                    <Input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Nhập tên khách hàng mới"
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <Label className="mb-3 block">Phương thức thanh toán</Label>
              <div className="space-y-3">
                <div
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'cash' 
                      ? 'bg-green-100 border-2 border-green-500 shadow-md ring-2 ring-green-200' 
                      : 'bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    paymentMethod === 'cash' 
                      ? 'border-green-600 bg-green-600 shadow-sm' 
                      : 'border-gray-400'
                  }`}>
                    {paymentMethod === 'cash' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <Wallet className={paymentMethod === 'cash' ? 'text-green-700' : 'text-green-600'} size={20} />
                    <div>
                      <p className={`font-medium ${paymentMethod === 'cash' ? 'text-green-900' : 'text-gray-900'}`}>
                        Tiền mặt
                      </p>
                      <p className={`text-xs ${paymentMethod === 'cash' ? 'text-green-700' : 'text-gray-500'}`}>
                        Thanh toán bằng tiền mặt
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  onClick={() => {
                    setPaymentMethod('transfer');
                    // Đảm bảo set selectedBankAccount ngay khi chọn transfer
                    if (!selectedBankAccount && defaultBankAccount) {
                      setSelectedBankAccount(defaultBankAccount);
                    }
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'transfer' 
                      ? 'bg-purple-100 border-2 border-purple-500 shadow-md ring-2 ring-purple-200' 
                      : 'bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    paymentMethod === 'transfer' 
                      ? 'border-purple-600 bg-purple-600 shadow-sm' 
                      : 'border-gray-400'
                  }`}>
                    {paymentMethod === 'transfer' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <Building2 className={paymentMethod === 'transfer' ? 'text-purple-700' : 'text-purple-600'} size={20} />
                    <div>
                      <p className={`font-medium ${paymentMethod === 'transfer' ? 'text-purple-900' : 'text-gray-900'}`}>
                        Chuyển khoản
                      </p>
                      <p className={`text-xs ${paymentMethod === 'transfer' ? 'text-purple-700' : 'text-gray-500'}`}>
                        Chuyển khoản ngân hàng
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tạm tính:</span>
                <span className="font-medium">{subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              {promotionDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm khuyến mãi:</span>
                  <span>-{promotionDiscount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm mã giảm giá:</span>
                  <span>-{voucherDiscount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              {discountAmount > 0 && (promotionDiscount === 0 && voucherDiscount === 0) && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm giá:</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="font-semibold">Tổng cộng:</span>
                <span className="text-xl font-bold text-green-600">{total.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleConfirmPayment} className="gap-2">
              <CreditCard size={16} />
              Xác nhận thanh toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Selection Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn QR Code Thanh Toán</DialogTitle>
          </DialogHeader>
          {shopInfo?.bankAccounts && shopInfo.bankAccounts.length > 0 ? (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {shopInfo.bankAccounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => {
                    setSelectedBankAccount(account);
                    setIsQRDialogOpen(false);
                  }}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedBankAccount?.id === account.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getBankIconUrl(account.bankName) && (
                          <img 
                            src={getBankIconUrl(account.bankName)} 
                            alt={account.bankName}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <p className="font-medium">{account.bankName}</p>
                      </div>
                      <p className="text-sm text-gray-600 font-mono">{account.accountNumber}</p>
                      <p className="text-sm text-gray-500">{account.accountHolder}</p>
                    </div>
                    {selectedBankAccount?.id === account.id && (
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Chưa có tài khoản ngân hàng nào</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {currentInvoice && (
        <InvoiceReceipt
          invoice={currentInvoice}
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}

      {/* Alert Component */}
      <AlertComponent />
    </div>
  );
}
