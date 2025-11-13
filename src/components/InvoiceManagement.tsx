import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Search, Eye, FileText, Calendar, DollarSign, ArrowUpDown, X, Printer, Loader2, Tag, User, Clock, ChevronLeft, ChevronRight, Receipt, Wallet, Building2, RefreshCw, QrCode, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { InvoiceReceipt } from './InvoiceReceipt';
import { useInvoices, Invoice } from '../hooks/useInvoices';
import { usePromotions } from '../hooks/usePromotions';
import { useCustomers } from '../hooks/useCustomers';
import { useAlert } from './AlertDialog';
import { useShopInfo, BankAccount } from '../contexts/ShopInfoContext';
import { Label } from './ui/label';

const INVOICES_PER_PAGE = 9;

export function InvoiceManagement() {
  const { invoices, loading, updateInvoice } = useInvoices();
  const { promotions } = usePromotions();
  const { customers, updateCustomer } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [isPayDebtDialogOpen, setIsPayDebtDialogOpen] = useState(false);
  const [selectedDebtInvoice, setSelectedDebtInvoice] = useState<Invoice | null>(null);
  const [payDebtMethod, setPayDebtMethod] = useState<'cash' | 'transfer'>('cash');
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [banksList, setBanksList] = useState<any[]>([]);
  const { alert, AlertComponent } = useAlert();
  const { shopInfo } = useShopInfo();

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

  // Initialize selected bank account when payment method changes to transfer
  useEffect(() => {
    if (payDebtMethod === 'transfer' && defaultBankAccount) {
      const isSelectedAccountValid = selectedBankAccount && 
        shopInfo?.bankAccounts?.some(acc => acc.id === selectedBankAccount.id);
      if (!selectedBankAccount || !isSelectedAccountValid) {
        setSelectedBankAccount(defaultBankAccount);
      }
    }
  }, [payDebtMethod, defaultBankAccount, selectedBankAccount, shopInfo]);

  // Get bank icon URL
  const getBankIconUrl = (bankName: string): string => {
    const bank = banksList.find(b => b.name === bankName);
    if (bank && bank.short_name) {
      return `https://img.vietqr.io/${bank.short_name}/compact.png`;
    }
    return '';
  };

  // Get QR code URL
  const getQRCodeUrl = (account: BankAccount, amount: number, invoiceCode?: string): string => {
    let bankCode = account.bankCode;
    if (!bankCode || bankCode === '') {
      const bank = banksList.find(b => b.name === account.bankName);
      if (bank && bank.short_name) {
        bankCode = bank.short_name;
      } else {
        return '';
      }
    }

    const shopName = shopInfo?.name || 'Shop';
    const invoiceId = invoiceCode || selectedDebtInvoice?.invoiceCode || selectedDebtInvoice?.id || '';
    const description = `Hóa đơn ${invoiceId}: THANH TOAN HOA QUA ${shopName}`;

    const params = new URLSearchParams({
      acc: account.accountNumber,
      bank: bankCode || '',
      amount: amount.toString(),
      des: description,
    });

    return `https://qr.sepay.vn/img?${params.toString()}`;
  };
  
  // Mặc định lọc ngày hôm nay
  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(today);
  const [filterPayment, setFilterPayment] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(invoice => {
    const invoiceCodeOrId = invoice.invoiceCode || invoice.id;
    const matchesSearch = invoiceCodeOrId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate === 'all' || invoice.date === filterDate;
    const matchesPayment = filterPayment === 'all' || invoice.paymentMethod === filterPayment;
    return matchesSearch && matchesDate && matchesPayment;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-desc':
            return new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime();
          case 'date-asc':
            return new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime();
          case 'total-desc':
            return b.total - a.total;
          case 'total-asc':
            return a.total - b.total;
          default:
            return 0;
        }
      });
  }, [invoices, searchTerm, filterDate, filterPayment, sortBy]);

  // Phân trang
  const totalPages = Math.ceil(filteredInvoices.length / INVOICES_PER_PAGE);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * INVOICES_PER_PAGE;
    const endIndex = startIndex + INVOICES_PER_PAGE;
    return filteredInvoices.slice(startIndex, endIndex);
  }, [filteredInvoices, currentPage]);

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterPayment, searchTerm, sortBy]);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDialogOpen(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setPrintInvoice(invoice);
    setIsReceiptOpen(true);
  };

  const getPaymentMethodLabel = (method: Invoice['paymentMethod']) => {
    const labels: Record<string, string> = {
      cash: 'Tiền mặt',
      card: 'Thẻ',
      transfer: 'Chuyển khoản',
      debt: 'Nợ',
    };
    return labels[method] || method;
  };

  const totalRevenue = useMemo(() => 
    filteredInvoices.reduce((sum, inv) => sum + inv.total, 0), 
    [filteredInvoices]
  );
  const totalDiscount = useMemo(() => 
    filteredInvoices.reduce((sum, inv) => sum + inv.discount, 0), 
    [filteredInvoices]
  );
  const averageOrder = useMemo(() => 
    filteredInvoices.length > 0 ? totalRevenue / filteredInvoices.length : 0, 
    [filteredInvoices, totalRevenue]
  );

  // Tính tổng số dư nợ còn thiếu (chỉ tính những khách hàng có debtAmount > 0)
  const totalDebt = useMemo(() => 
    customers
      .filter(c => c.debtAmount !== undefined && c.debtAmount > 0)
      .reduce((sum, c) => sum + (c.debtAmount || 0), 0),
    [customers]
  );

  const uniqueDates = useMemo(() => 
    Array.from(new Set(invoices.map(inv => inv.date))).sort().reverse(),
    [invoices]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-gray-900">Quản Lý Hóa Đơn</h1>
      </div>

      <div className="p-6 space-y-6 overflow-auto">
        {/* Stats */}
        <div className="flex gap-3 overflow-x-auto">
          <Card className="p-4 flex-shrink-0 min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="text-blue-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600">Tổng hóa đơn</p>
                <p className="text-sm font-semibold text-gray-900">{filteredInvoices.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 flex-shrink-0 min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="text-green-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600">Tổng doanh thu</p>
                <p className="text-sm font-semibold text-gray-900">{totalRevenue.toLocaleString('vi-VN')}₫</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 flex-shrink-0 min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="text-purple-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600">Trung bình đơn</p>
                <p className="text-sm font-semibold text-gray-900">{averageOrder.toLocaleString('vi-VN')}₫</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 flex-shrink-0 min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="text-orange-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600">Tổng giảm giá</p>
                <p className="text-sm font-semibold text-gray-900">{totalDiscount.toLocaleString('vi-VN')}₫</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 flex-shrink-0 min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-red-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600">Tổng dư nợ</p>
                <p className="text-sm font-semibold text-gray-900">{totalDebt.toLocaleString('vi-VN')}₫</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Sort */}
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Tìm mã hóa đơn hoặc tên khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterDate} onValueChange={setFilterDate}>
            <SelectTrigger className="w-[180px]">
                <Calendar size={16} className="mr-2" />
              <SelectValue placeholder="Chọn ngày" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả ngày</SelectItem>
              <SelectItem value={today}>Hôm nay</SelectItem>
              {uniqueDates.filter(date => date !== today).map(date => (
                <SelectItem key={date} value={date}>
                  {new Date(date).toLocaleDateString('vi-VN')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Thanh toán" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="cash">Tiền mặt</SelectItem>
              <SelectItem value="card">Thẻ</SelectItem>
              <SelectItem value="transfer">Chuyển khoản</SelectItem>
            </SelectContent>
          </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px] gap-2">
                <ArrowUpDown size={16} />
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Ngày mới nhất</SelectItem>
                <SelectItem value="date-asc">Ngày cũ nhất</SelectItem>
                <SelectItem value="total-desc">Tổng tiền giảm dần</SelectItem>
                <SelectItem value="total-asc">Tổng tiền tăng dần</SelectItem>
              </SelectContent>
            </Select>
            {(filterDate !== 'all' || filterPayment !== 'all' || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDate('all');
                  setFilterPayment('all');
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

        {/* Invoices Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">
              {searchTerm || filterDate !== 'all' || filterPayment !== 'all' 
                ? 'Không tìm thấy hóa đơn nào' 
                : 'Chưa có hóa đơn nào'}
            </p>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedInvoices.map(invoice => (
            <Card key={invoice.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <code className="bg-blue-100 text-blue-700 px-2 py-1 rounded">{invoice.invoiceCode || invoice.id}</code>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <Calendar size={14} />
                      <span>{new Date(invoice.date).toLocaleDateString('vi-VN')}</span>
                      <span>{invoice.time}</span>
                    </div>
                  </div>
                  <Badge variant="outline">{getPaymentMethodLabel(invoice.paymentMethod)}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Khách hàng:</span>
                    <span className="font-medium">{invoice.customerName || 'Khách lẻ'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Số mặt hàng:</span>
                    <span>{invoice.items.length} mặt hàng</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tạm tính:</span>
                    <span>{invoice.subtotal.toLocaleString('vi-VN')}₫</span>
                  </div>
                  {(invoice.promotionDiscount && invoice.promotionDiscount > 0) && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="text-gray-600">Giảm khuyến mãi:</span>
                      <span>-{invoice.promotionDiscount.toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                  {(invoice.voucherDiscount && invoice.voucherDiscount > 0) && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="text-gray-600">Giảm mã giảm giá:</span>
                      <span>-{invoice.voucherDiscount.toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                  {invoice.discount > 0 && (!invoice.promotionDiscount || invoice.promotionDiscount === 0) && (!invoice.voucherDiscount || invoice.voucherDiscount === 0) && (
                    <div className={`flex justify-between text-sm ${invoice.discount > 0 ? 'text-green-600' : ''}`}>
                      <span className="text-gray-600">Giảm giá:</span>
                      <span>{invoice.discount > 0 ? `-${invoice.discount.toLocaleString('vi-VN')}₫` : '0₫'}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Tổng tiền</p>
                    <p className="text-lg font-bold text-gray-900">{invoice.total.toLocaleString('vi-VN')}₫</p>
                    {invoice.customerName && (
                      <p className="text-xs text-gray-500 mt-1">KH: {invoice.customerName}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewInvoice(invoice)}
                  >
                    <Eye size={14} className="mr-2" />
                    Chi tiết
                  </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintInvoice(invoice)}
                    >
                      <Printer size={14} className="mr-2" />
                      In
                    </Button>
                    {invoice.paymentMethod === 'debt' && invoice.customerId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDebtInvoice(invoice);
                          setPayDebtMethod('cash');
                          setIsPayDebtDialogOpen(true);
                        }}
                        className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      >
                        <Receipt size={14} className="mr-2" />
                        Trả nợ
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} className="mr-1" />
              Trước
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Hiển thị tối đa 5 số trang
                if (totalPages <= 7) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  );
                } else {
                  // Logic hiển thị trang với ellipsis
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2">...</span>;
                  }
                  return null;
                }
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Sau
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
        
        {/* Hiển thị thông tin phân trang */}
        {filteredInvoices.length > 0 && (
          <div className="text-center text-sm text-gray-600 mt-4">
            Hiển thị {((currentPage - 1) * INVOICES_PER_PAGE) + 1} - {Math.min(currentPage * INVOICES_PER_PAGE, filteredInvoices.length)} trong tổng số {filteredInvoices.length} hóa đơn
          </div>
        )}
        </>
        )}
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
            <DialogTitle>Chi Tiết Hóa Đơn</DialogTitle>
                <DialogDescription className="mt-1">
                  Mã hóa đơn: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{selectedInvoice?.invoiceCode || selectedInvoice?.id}</code>
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {selectedInvoice && selectedInvoice.paymentMethod === 'debt' && selectedInvoice.customerId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedInvoice) {
                        setSelectedDebtInvoice(selectedInvoice);
                        setPayDebtMethod('cash');
                        setIsPayDebtDialogOpen(true);
                        setIsDialogOpen(false);
                      }
                    }}
                    className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <Receipt size={16} />
                    Trả nợ
                  </Button>
                )}
                {selectedInvoice && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedInvoice) {
                        handlePrintInvoice(selectedInvoice);
                        setIsDialogOpen(false);
                      }
                    }}
                    className="gap-2"
                  >
                    <Printer size={16} />
                    In hóa đơn
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Calendar size={16} />
                      <span className="font-semibold">Thông tin hóa đơn</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ngày:</span>
                      <span className="font-medium">{new Date(selectedInvoice.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Giờ:</span>
                      <span className="font-medium">{selectedInvoice.time}</span>
                </div>
                    {selectedInvoice.createdAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Clock size={12} />
                          Tạo lúc:
                        </span>
                        <span className="font-medium">
                          {new Date(selectedInvoice.createdAt).toLocaleString('vi-VN')}
                        </span>
                </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <User size={16} />
                      <span className="font-semibold">Khách hàng & Thanh toán</span>
                    </div>
                    {selectedInvoice.customerId ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Khách hàng:</span>
                        <span className="font-medium">
                          {customers.find(c => c.id === selectedInvoice.customerId)?.name || selectedInvoice.customerName || 'Khách lẻ'}
                        </span>
                      </div>
                    ) : selectedInvoice.customerName ? (
                      <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Khách hàng:</span>
                        <span className="font-medium">{selectedInvoice.customerName}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Khách hàng:</span>
                        <span className="font-medium text-gray-400">Khách lẻ</span>
                  </div>
                )}
                    <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Thanh toán:</span>
                  <Badge variant="outline">{getPaymentMethodLabel(selectedInvoice.paymentMethod)}</Badge>
                </div>
                  </div>
                </Card>
              </div>

              {/* Promotions & Vouchers */}
              {(selectedInvoice.promotionSnapshots && selectedInvoice.promotionSnapshots.length > 0) || 
               (selectedInvoice.promotionIds && selectedInvoice.promotionIds.length > 0) || 
               selectedInvoice.voucherSnapshot || 
               selectedInvoice.voucherCode ? (
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <Tag size={16} />
                    <span className="font-semibold">Khuyến mãi & Voucher</span>
                  </div>
                <div className="space-y-2">
                    {/* Ưu tiên sử dụng snapshot, fallback về lookup từ database */}
                    {selectedInvoice.promotionSnapshots && selectedInvoice.promotionSnapshots.length > 0 ? (
                      <div>
                        <span className="text-sm text-gray-600">Khuyến mãi đã áp dụng:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedInvoice.promotionSnapshots.map((promoSnapshot, index) => (
                            <Badge key={promoSnapshot.id || index} variant="secondary" className="gap-1">
                              <Tag size={12} />
                              {promoSnapshot.name}
                              {promoSnapshot.discountAmount > 0 && (
                                <span className="ml-1 text-xs">(-{promoSnapshot.discountAmount.toLocaleString('vi-VN')}₫)</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : selectedInvoice.promotionIds && selectedInvoice.promotionIds.length > 0 ? (
                      <div>
                        <span className="text-sm text-gray-600">Khuyến mãi đã áp dụng:</span>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {selectedInvoice.promotionIds.map(promoId => {
                            const promotion = promotions.find(p => p.id === promoId);
                            return promotion ? (
                              <Badge key={promoId} variant="secondary" className="gap-1">
                                <Tag size={12} />
                                {promotion.name}
                              </Badge>
                            ) : (
                              <Badge key={promoId} variant="secondary" className="gap-1">
                                <Tag size={12} />
                                ID: {promoId} (đã xóa)
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Ưu tiên sử dụng snapshot, fallback về voucherCode */}
                    {selectedInvoice.voucherSnapshot ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Mã voucher:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-mono text-sm">
                            {selectedInvoice.voucherSnapshot.code}
                          </code>
                          {selectedInvoice.voucherSnapshot.discountAmount > 0 && (
                            <span className="text-xs text-green-600">
                              (-{selectedInvoice.voucherSnapshot.discountAmount.toLocaleString('vi-VN')}₫)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : selectedInvoice.voucherCode ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Mã voucher:</span>
                        <code className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-mono text-sm">
                          {selectedInvoice.voucherCode}
                        </code>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ) : null}

              {/* Products List */}
              <div>
                <p className="text-gray-900 font-semibold mb-3">Danh sách sản phẩm</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">STT</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tên sản phẩm</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Đơn giá</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Số lượng</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{item.productName}</p>
                              {item.unit && (
                                <p className="text-xs text-gray-500 mt-0.5">Đơn vị: {item.unit}</p>
                              )}
                    </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {item.price.toLocaleString('vi-VN')}₫
                            {item.unit && <span className="text-xs text-gray-400">/{item.unit}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            {item.quantity} {item.unit ? item.unit : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <Card className="p-4 bg-gray-50">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tạm tính:</span>
                    <span className="font-medium">{selectedInvoice.subtotal.toLocaleString('vi-VN')}₫</span>
                  </div>
                  {(selectedInvoice.promotionDiscount && selectedInvoice.promotionDiscount > 0) && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Giảm khuyến mãi:</span>
                      <span className="font-medium">-{selectedInvoice.promotionDiscount.toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                  {(selectedInvoice.voucherDiscount && selectedInvoice.voucherDiscount > 0) && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Giảm mã giảm giá:</span>
                      <span className="font-medium">-{selectedInvoice.voucherDiscount.toLocaleString('vi-VN')}₫</span>
                </div>
                  )}
                  {selectedInvoice.discount > 0 && (!selectedInvoice.promotionDiscount || selectedInvoice.promotionDiscount === 0) && (!selectedInvoice.voucherDiscount || selectedInvoice.voucherDiscount === 0) && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Giảm giá:</span>
                      <span className="font-medium">-{selectedInvoice.discount.toLocaleString('vi-VN')}₫</span>
                      </div>
                    )}
                  <div className="flex justify-between pt-3 border-t-2 border-gray-300">
                    <div>
                      <span className="text-lg font-bold text-gray-900">Tổng cộng:</span>
                      {selectedInvoice.customerName && (
                        <p className="text-sm text-gray-500 mt-1">
                          Khách hàng: <span className="font-semibold text-gray-700">{selectedInvoice.customerName}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-gray-900">{selectedInvoice.total.toLocaleString('vi-VN')}₫</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Print Dialog */}
      {printInvoice && shopInfo && (
        <InvoiceReceipt
          invoice={{
            id: printInvoice.id,
            invoiceCode: printInvoice.invoiceCode,
            date: printInvoice.date,
            time: printInvoice.time,
            items: printInvoice.items.map((item: any) => ({
              productName: item.name || item.productName,
              quantity: item.quantity,
              price: item.price,
            })),
            subtotal: printInvoice.subtotal,
            discount: printInvoice.discount,
            promotionDiscount: printInvoice.promotionDiscount,
            voucherDiscount: printInvoice.voucherDiscount,
            total: printInvoice.total,
            paymentMethod: printInvoice.paymentMethod === 'debt' ? 'cash' : (printInvoice.paymentMethod === 'card' ? 'card' : printInvoice.paymentMethod === 'transfer' ? 'transfer' : 'cash'),
            customerName: printInvoice.customerName,
            voucherCode: printInvoice.voucherCode,
          }}
          shopInfo={{
            name: shopInfo.name || 'Shop',
            address: shopInfo.address || '',
            phone: shopInfo.phone || '',
            taxCode: shopInfo.taxCode,
          }}
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setPrintInvoice(null);
          }}
        />
      )}

      {/* Pay Debt Dialog */}
      <Dialog open={isPayDebtDialogOpen} onOpenChange={setIsPayDebtDialogOpen}>
        <DialogContent className="!max-w-[95vw] !w-auto !sm:max-w-[95vw] max-h-[90vh] overflow-y-auto" style={{ width: 'auto', maxWidth: '95vw' }}>
          <DialogHeader>
            <DialogTitle>Trả Nợ Hóa Đơn</DialogTitle>
            <DialogDescription>
              {selectedDebtInvoice && (
                <>
                  Mã hóa đơn: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{selectedDebtInvoice.invoiceCode || selectedDebtInvoice.id}</code>
                  <br />
                  Khách hàng: <span className="font-semibold">{selectedDebtInvoice.customerName || 'Khách lẻ'}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDebtInvoice && (() => {
            const customer = customers.find(c => c.id === selectedDebtInvoice.customerId);
            const invoiceTotal = selectedDebtInvoice.total;
            const currentDebt = customer?.debtAmount || 0;
            
            return (
              <div className="flex gap-6 py-4">
                {/* Left Column - Invoice Info */}
                <div className="flex-1 space-y-6">
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Số tiền hóa đơn:</span>
                        <span className="font-bold text-lg text-gray-900">{invoiceTotal.toLocaleString('vi-VN')}₫</span>
                      </div>
                      {customer && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Dư nợ hiện tại:</span>
                          <span className={`font-semibold ${currentDebt > 0 ? 'text-red-600' : currentDebt < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                            {currentDebt.toLocaleString('vi-VN')}₫
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-gray-600">Dư nợ sau khi trả:</span>
                        <span className={`font-bold text-lg ${
                          (() => {
                            const newDebt = currentDebt > 0 
                              ? currentDebt - invoiceTotal
                              : currentDebt + invoiceTotal;
                            return newDebt > 0 ? 'text-red-600' : 
                                   newDebt < 0 ? 'text-blue-600' : 
                                   'text-green-600';
                          })()
                        }`}>
                          {(() => {
                            const newDebt = currentDebt > 0 
                              ? currentDebt - invoiceTotal
                              : currentDebt + invoiceTotal;
                            return newDebt.toLocaleString('vi-VN');
                          })()}₫
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Middle Column - QR Code */}
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    payDebtMethod === 'transfer' && selectedBankAccount 
                      ? 'w-[280px] opacity-100' 
                      : 'w-0 opacity-0'
                  } flex-shrink-0 flex flex-col items-center justify-center`}
                >
                  {payDebtMethod === 'transfer' && selectedBankAccount && (
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
                        <div 
                          className={`bg-white p-3 rounded-lg border-4 border-purple-400 shadow-lg inline-block ${
                            shopInfo?.bankAccounts && shopInfo.bankAccounts.length > 1 
                              ? 'cursor-pointer hover:border-purple-500 hover:shadow-xl transition-all' 
                              : ''
                          }`}
                          onClick={() => {
                            if (shopInfo?.bankAccounts && shopInfo.bankAccounts.length > 1) {
                              setIsQRDialogOpen(true);
                            }
                          }}
                          title={shopInfo?.bankAccounts && shopInfo.bankAccounts.length > 1 ? 'Click để đổi QR code' : ''}
                        >
                          {(() => {
                            const qrUrl = getQRCodeUrl(selectedBankAccount, invoiceTotal, selectedDebtInvoice.invoiceCode || selectedDebtInvoice.id);
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
                          <p className="text-purple-800 font-bold mt-2">Số tiền: {invoiceTotal.toLocaleString('vi-VN')}₫</p>
                          {shopInfo?.bankAccounts && shopInfo.bankAccounts.length > 1 && (
                            <p className="text-xs text-purple-600 mt-2 italic">Click vào QR code để đổi</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Payment Method Selection */}
                <div className="w-[400px] space-y-6 flex-shrink-0">
                  <div>
                    <Label className="mb-3 block font-semibold">Phương thức thanh toán</Label>
                    <div className="space-y-3">
                      <div
                        onClick={() => setPayDebtMethod('cash')}
                        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                          payDebtMethod === 'cash' 
                            ? 'bg-green-100 border-2 border-green-500 shadow-md ring-2 ring-green-200' 
                            : 'bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          payDebtMethod === 'cash' 
                            ? 'border-green-600 bg-green-600 shadow-sm' 
                            : 'border-gray-400'
                        }`}>
                          {payDebtMethod === 'cash' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <Wallet className={payDebtMethod === 'cash' ? 'text-green-700' : 'text-green-600'} size={20} />
                          <div>
                            <p className={`font-medium ${payDebtMethod === 'cash' ? 'text-green-900' : 'text-gray-900'}`}>
                              Tiền mặt
                            </p>
                            <p className={`text-xs ${payDebtMethod === 'cash' ? 'text-green-700' : 'text-gray-500'}`}>
                              Thanh toán bằng tiền mặt
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          setPayDebtMethod('transfer');
                          if (!selectedBankAccount && defaultBankAccount) {
                            setSelectedBankAccount(defaultBankAccount);
                          }
                        }}
                        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                          payDebtMethod === 'transfer' 
                            ? 'bg-purple-100 border-2 border-purple-500 shadow-md ring-2 ring-purple-200' 
                            : 'bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          payDebtMethod === 'transfer' 
                            ? 'border-purple-600 bg-purple-600 shadow-sm' 
                            : 'border-gray-400'
                        }`}>
                          {payDebtMethod === 'transfer' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <Building2 className={payDebtMethod === 'transfer' ? 'text-purple-700' : 'text-purple-600'} size={20} />
                          <div>
                            <p className={`font-medium ${payDebtMethod === 'transfer' ? 'text-purple-900' : 'text-gray-900'}`}>
                              Chuyển khoản
                            </p>
                            <p className={`text-xs ${payDebtMethod === 'transfer' ? 'text-purple-700' : 'text-gray-500'}`}>
                              Chuyển khoản ngân hàng
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPayDebtDialogOpen(false);
                setSelectedDebtInvoice(null);
                setPayDebtMethod('cash');
              }}
            >
              Hủy
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedDebtInvoice || !selectedDebtInvoice.customerId) return;

                try {
                  const customer = customers.find(c => c.id === selectedDebtInvoice.customerId);
                  if (!customer) {
                    await alert({
                      title: 'Lỗi',
                      message: 'Không tìm thấy thông tin khách hàng!',
                      variant: 'danger',
                    });
                    return;
                  }

                  const invoiceTotal = selectedDebtInvoice.total;
                  const currentDebt = customer.debtAmount || 0;
                  // Trả nợ: giảm số nợ
                  // Nếu currentDebt dương (đang nợ): trừ để giảm nợ
                  // Nếu currentDebt âm (thiếu nợ): cộng để giảm thiếu nợ (số âm tăng về 0)
                  const newDebtAmount = currentDebt > 0 
                    ? currentDebt - invoiceTotal  // Đang nợ: trừ để giảm nợ
                    : currentDebt + invoiceTotal;  // Thiếu nợ: cộng để giảm thiếu nợ

                  // Tạo lịch sử nợ mới
                  const newHistoryEntry: any = {
                    id: Date.now().toString(),
                    newAmount: newDebtAmount,
                    changeAmount: currentDebt > 0 ? -invoiceTotal : invoiceTotal, // Nếu đang nợ: trừ (âm), nếu thiếu nợ: cộng (dương)
                    action: 'pay',
                    previousAmount: currentDebt,
                    note: `Trả nợ hóa đơn ${selectedDebtInvoice.invoiceCode || selectedDebtInvoice.id}`,
                    createdAt: new Date(),
                  };

                  // Cập nhật lịch sử
                  const existingHistory = (customer.debtHistory || []).map((entry: any) => {
                    const cleaned: any = {
                      id: entry.id,
                      newAmount: entry.newAmount,
                      changeAmount: entry.changeAmount,
                      action: entry.action,
                      createdAt: entry.createdAt,
                    };
                    if (entry.previousAmount !== undefined) {
                      cleaned.previousAmount = entry.previousAmount;
                    }
                    if (entry.note) {
                      cleaned.note = entry.note;
                    }
                    return cleaned;
                  });

                  const updatedHistory = [newHistoryEntry, ...existingHistory];

                  // Xóa invoiceId khỏi danh sách hóa đơn nợ
                  const existingDebtInvoiceIds = customer.debtInvoiceIds || [];
                  const updatedDebtInvoiceIds = existingDebtInvoiceIds.filter(id => id !== selectedDebtInvoice.id);

                  // Cập nhật dư nợ, lịch sử và danh sách hóa đơn nợ của khách hàng
                  await updateCustomer(selectedDebtInvoice.customerId, {
                    debtAmount: newDebtAmount,
                    debtHistory: updatedHistory,
                    debtInvoiceIds: updatedDebtInvoiceIds,
                  });

                  // Cập nhật phương thức thanh toán của hóa đơn từ 'debt' sang phương thức đã chọn
                  await updateInvoice(selectedDebtInvoice.id, {
                    paymentMethod: payDebtMethod,
                  });

                  // KHÔNG cập nhật thống kê mua hàng khi trả nợ
                  // Vì hóa đơn nợ đã được tính vào thống kê khi tạo (trong POS.tsx)
                  // Nếu cập nhật lại ở đây sẽ bị cộng trùng

                  await alert({
                    title: 'Thành công',
                    message: `Đã trả nợ ${invoiceTotal.toLocaleString('vi-VN')}₫ cho hóa đơn ${selectedDebtInvoice.invoiceCode || selectedDebtInvoice.id}!`,
                    variant: 'success',
                  });

                  // Đóng dialog
                  setIsPayDebtDialogOpen(false);
                  setSelectedDebtInvoice(null);
                  setPayDebtMethod('cash');
                } catch (error: any) {
                  console.error('Error paying debt:', error);
                  await alert({
                    title: 'Lỗi',
                    message: 'Không thể trả nợ. Vui lòng thử lại.',
                    variant: 'danger',
                  });
                }
              }}
            >
              Xác nhận trả nợ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Selection Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode size={20} />
              Chọn Tài Khoản Ngân Hàng
            </DialogTitle>
            <DialogDescription>
              Chọn tài khoản ngân hàng để hiển thị QR code thanh toán
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {shopInfo?.bankAccounts && shopInfo.bankAccounts.length > 0 ? (
              shopInfo.bankAccounts.map((account) => {
                const isSelected = selectedBankAccount?.id === account.id;
                return (
                  <div
                    key={account.id}
                    onClick={() => {
                      setSelectedBankAccount(account);
                      setIsQRDialogOpen(false);
                    }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getBankIconUrl(account.bankName) && (
                        <img 
                          src={getBankIconUrl(account.bankName)} 
                          alt={account.bankName}
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{account.bankName}</p>
                          {account.isDefault && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                              Mặc định
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                              Đang chọn
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 font-mono mt-1">{account.accountNumber}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{account.accountHolder}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Building2 className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-500 font-medium mb-1">Chưa có tài khoản ngân hàng</p>
                <p className="text-sm text-gray-400">
                  Vui lòng thêm tài khoản ngân hàng trong cài đặt cửa hàng
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQRDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertComponent />
    </div>
  );
}
