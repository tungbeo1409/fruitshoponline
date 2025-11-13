import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, Plus, Edit, Users, Filter, Loader2, Eye, EyeOff, RotateCcw, Phone, Mail, MapPin, FileText, DollarSign, TrendingUp, TrendingDown, CheckCircle, History, ShoppingBag, Calendar } from 'lucide-react';
import { ImageCropper } from './ImageCropper';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ConfirmDialog } from './ConfirmDialog';
import { useAlert } from './AlertDialog';
import { useCustomers, Customer } from '../hooks/useCustomers';
import { useInvoices } from '../hooks/useInvoices';

export function CustomerManagement() {
  const { alert, AlertComponent } = useAlert();
  
  // Firestore hooks
  const { customers, loading, addCustomer, updateCustomer } = useCustomers();
  const { invoices, updateInvoice } = useInvoices();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'phone' | 'email'>('name');
  const [showInactive, setShowInactive] = useState(false); // Hiển thị khách hàng ẩn
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    image: '',
  });
  const [deactivateCustomerId, setDeactivateCustomerId] = useState<string | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [selectedCustomerForDebt, setSelectedCustomerForDebt] = useState<Customer | null>(null);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtAction, setDebtAction] = useState<'add' | 'pay'>('pay'); // add = thêm nợ, pay = trả nợ (mặc định trả nợ)
  const [debtNote, setDebtNote] = useState(''); // Ghi chú dư nợ
  const [isDebtHistoryDialogOpen, setIsDebtHistoryDialogOpen] = useState(false);
  const [selectedDebtInvoices, setSelectedDebtInvoices] = useState<string[]>([]); // Danh sách hóa đơn được chọn để trả nợ

  // Filter and sort customers
  const filteredCustomers = customers
    .filter(customer => {
      // Filter by active/inactive status
      const isActive = customer.isActive !== false; // Mặc định true
      if (!showInactive && !isActive) return false; // Ẩn khách hàng inactive nếu không bật showInactive
      if (showInactive && isActive) return false; // Chỉ hiển thị inactive khi showInactive = true
      
      // Filter by search term
      const searchLower = searchTerm.toLowerCase();
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchLower)) ||
        (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
        (customer.address && customer.address.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      // Luôn sắp xếp theo số tiền mua giảm dần trước
      const aSpent = a.totalSpent || 0;
      const bSpent = b.totalSpent || 0;
      if (bSpent !== aSpent) {
        return bSpent - aSpent;
      }
      
      // Nếu số tiền bằng nhau, sắp xếp theo sortBy
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'phone':
          return (a.phone || '').localeCompare(b.phone || '');
        case 'email':
          return (a.email || '').localeCompare(b.email || '');
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Customer handlers
  const handleOpenCustomerDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || '',
        image: customer.image || '',
      });
    } else {
      setEditingCustomer(null);
      setCustomerFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        image: '',
      });
    }
    setIsCustomerDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    // Chỉ yêu cầu tên, các trường khác không bắt buộc
    if (!customerFormData.name || !customerFormData.name.trim()) {
      await alert({
        title: 'Thông báo',
        message: 'Vui lòng nhập tên khách hàng!',
        variant: 'warning',
      });
      return;
    }

    try {
      // Build customer data - always include all fields so update knows what to change
      const customerData: any = {
        name: customerFormData.name.trim(),
        // Always include optional fields (empty string if not provided) so update knows to clear them
        phone: customerFormData.phone?.trim() || '',
        email: customerFormData.email?.trim() || '',
        address: customerFormData.address?.trim() || '',
        notes: customerFormData.notes?.trim() || '',
        image: customerFormData.image || '',
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, customerData);
        await alert({
          title: 'Thành công',
          message: 'Cập nhật thông tin khách hàng thành công!',
          variant: 'success',
        });
      } else {
        await addCustomer(customerData);
        await alert({
          title: 'Thành công',
          message: 'Thêm khách hàng mới thành công!',
          variant: 'success',
        });
      }

      setIsCustomerDialogOpen(false);
      setEditingCustomer(null);
      // Reset form
      setCustomerFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        image: '',
      });
    } catch (error: any) {
      console.error('Error saving customer:', error);
      let errorMessage = 'Không thể lưu khách hàng. Vui lòng thử lại.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Bạn không có quyền thực hiện thao tác này. Vui lòng kiểm tra Firestore security rules.';
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

  const handleDeactivate = (id: string) => {
    setDeactivateCustomerId(id);
    setIsDeactivateDialogOpen(true);
  };

  const confirmDeactivateCustomer = async () => {
    if (deactivateCustomerId) {
      try {
        await updateCustomer(deactivateCustomerId, { isActive: false });
        setDeactivateCustomerId(null);
        setIsDeactivateDialogOpen(false);
        await alert({
          title: 'Thành công',
          message: 'Đã dừng hoạt động khách hàng.',
          variant: 'success',
        });
      } catch (error: any) {
        await alert({
          title: 'Lỗi',
          message: 'Không thể dừng hoạt động khách hàng. Vui lòng thử lại.',
          variant: 'danger',
        });
      }
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await updateCustomer(id, { isActive: true });
      await alert({
        title: 'Thành công',
        message: 'Đã kích hoạt lại khách hàng.',
        variant: 'success',
      });
    } catch (error: any) {
      await alert({
        title: 'Lỗi',
        message: 'Không thể kích hoạt lại khách hàng. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản Lý Khách Hàng</h1>
            <p className="text-gray-500 mt-1">Quản lý thông tin khách hàng</p>
          </div>
          <Button onClick={() => handleOpenCustomerDialog()}>
            <Plus className="mr-2" size={20} />
            Thêm Khách Hàng
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Tìm kiếm theo tên, số điện thoại, email, địa chỉ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showInactive ? "default" : "outline"}
            onClick={() => setShowInactive(!showInactive)}
            className="gap-2"
          >
            {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
            {showInactive ? 'Ẩn khách hàng dừng hoạt động' : 'Hiển thị khách hàng dừng hoạt động'}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2" size={16} />
                Sắp xếp
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <Label className="text-base font-semibold mb-3 block">Sắp xếp theo</Label>
              <Select value={sortBy} onValueChange={(value: 'name' | 'phone' | 'email') => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Tên</SelectItem>
                  <SelectItem value="phone">Số điện thoại</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Customers Cards */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">
              {searchTerm ? 'Không tìm thấy khách hàng nào' : 'Chưa có khách hàng nào'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                  customer.isActive === false ? 'opacity-60 border-orange-200' : 'border-gray-200'
                }`}
              >
                {/* Header with Avatar */}
                <div className="flex items-start gap-3 mb-3">
                  {customer.image ? (
                    <img
                      src={customer.image}
                      alt={customer.name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 border-2 border-gray-200">
                      <Users size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {customer.name}
                      </h3>
                      {customer.isActive === false && (
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded flex-shrink-0">
                          Dừng hoạt động
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{customer.phone || '--'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{customer.email || '--'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{customer.address || '--'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <FileText size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{customer.notes || '--'}</span>
                  </div>
                  
                  {/* Purchase Statistics */}
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <ShoppingBag size={14} className="text-gray-400" />
                        <span>Tổng mua:</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {(customer.totalSpent || 0).toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText size={14} className="text-gray-400" />
                        <span>Số lần mua:</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {customer.purchaseCount || 0}
                      </span>
                    </div>
                    {customer.purchaseFrequency !== undefined && customer.purchaseFrequency > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={14} className="text-gray-400" />
                          <span>Tần suất:</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {customer.purchaseFrequency.toFixed(2)} lần/ngày
                        </span>
                      </div>
                    )}
                    {customer.lastPurchaseDate && (
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                        <span>Mua cuối:</span>
                        <span>
                          {new Date(customer.lastPurchaseDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Debt Status Badge */}
                  {(() => {
                    const debt = customer.debtAmount;
                    if (debt === undefined) {
                      return (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2 pt-2 border-t border-gray-100">
                          <DollarSign size={16} className="text-gray-400" />
                          <span>Chưa quản lý nợ</span>
                        </div>
                      );
                    } else if (debt > 0) {
                      return (
                        <div className="flex items-center gap-2 text-sm text-red-600 mt-2 pt-2 border-t border-red-100 bg-red-50 px-2 py-1 rounded">
                          <TrendingUp size={16} />
                          <span className="font-semibold">Nợ: {debt.toLocaleString('vi-VN')}₫</span>
                        </div>
                      );
                    } else if (debt < 0) {
                      return (
                        <div className="flex items-center gap-2 text-sm text-blue-600 mt-2 pt-2 border-t border-blue-100 bg-blue-50 px-2 py-1 rounded">
                          <TrendingDown size={16} />
                          <span className="font-semibold">Thiếu nợ: {Math.abs(debt).toLocaleString('vi-VN')}₫</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-2 text-sm text-green-600 mt-2 pt-2 border-t border-green-100 bg-green-50 px-2 py-1 rounded">
                          <CheckCircle size={16} />
                          <span className="font-semibold">Đã hết nợ</span>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                  {customer.isActive === false ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReactivate(customer.id)}
                      className="w-full gap-1"
                    >
                      <RotateCcw size={14} />
                      Hoạt động lại
                    </Button>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCustomerDialog(customer)}
                          className="flex-1 gap-1"
                        >
                          <Edit size={14} />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivate(customer.id)}
                          className="flex-1 gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <EyeOff size={14} />
                          Dừng
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomerForDebt(customer);
                          setDebtAmount('');
                          // Nếu không có nợ hoặc nợ = 0, mặc định chọn "Thêm nợ"
                          if (customer.debtAmount === undefined || customer.debtAmount <= 0) {
                            setDebtAction('add');
                          } else {
                            setDebtAction('pay');
                          }
                          setIsDebtDialogOpen(true);
                        }}
                        className="w-full gap-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <DollarSign size={14} />
                        Quản lý dư nợ
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? 'Cập nhật thông tin khách hàng' : 'Nhập thông tin khách hàng mới'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Ảnh khách hàng</Label>
              <ImageCropper
                image={customerFormData.image}
                onImageChange={(imageUrl) => setCustomerFormData({ ...customerFormData, image: imageUrl })}
                width={150}
                height={150}
              />
            </div>
            <div>
              <Label className="mb-2 block">Tên khách hàng *</Label>
              <Input
                value={customerFormData.name}
                onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                placeholder="Nhập tên khách hàng"
              />
            </div>
            <div>
              <Label className="mb-2 block">Số điện thoại</Label>
              <Input
                value={customerFormData.phone}
                onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                placeholder="Nhập số điện thoại (tùy chọn)"
              />
            </div>
            <div>
              <Label className="mb-2 block">Email</Label>
              <Input
                type="email"
                value={customerFormData.email}
                onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                placeholder="Nhập email (tùy chọn)"
              />
            </div>
            <div>
              <Label className="mb-2 block">Địa chỉ</Label>
              <Input
                value={customerFormData.address}
                onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                placeholder="Nhập địa chỉ (tùy chọn)"
              />
            </div>
            <div>
              <Label className="mb-2 block">Ghi chú</Label>
              <Input
                value={customerFormData.notes}
                onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })}
                placeholder="Nhập ghi chú (tùy chọn)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveCustomer}>
              {editingCustomer ? 'Cập Nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
        title="Dừng hoạt động khách hàng"
        message="Bạn có chắc chắn muốn dừng hoạt động khách hàng này? Khách hàng sẽ bị ẩn khỏi danh sách nhưng vẫn có thể kích hoạt lại sau."
        confirmText="Dừng hoạt động"
        cancelText="Hủy"
        variant="warning"
        onConfirm={confirmDeactivateCustomer}
      />

      {/* Debt Management Dialog */}
      <Dialog open={isDebtDialogOpen} onOpenChange={setIsDebtDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Quản Lý Dư Nợ</DialogTitle>
                <DialogDescription>
                  {selectedCustomerForDebt && `Khách hàng: ${selectedCustomerForDebt.name}`}
                </DialogDescription>
              </div>
              {selectedCustomerForDebt && selectedCustomerForDebt.debtHistory && selectedCustomerForDebt.debtHistory.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDebtHistoryDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Eye size={16} />
                  Xem lịch sử
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {selectedCustomerForDebt && (() => {
            const currentDebt = selectedCustomerForDebt.debtAmount;
            const isNewDebt = currentDebt === undefined;
            const hasDebt = currentDebt !== undefined && currentDebt > 0;
            const hasOverpayment = currentDebt !== undefined && currentDebt < 0;
            
            // Lấy danh sách hóa đơn đang nợ
            const debtInvoiceIds = selectedCustomerForDebt.debtInvoiceIds || [];
            const debtInvoices = invoices.filter(inv => 
              inv.paymentMethod === 'debt' && 
              inv.customerId === selectedCustomerForDebt.id &&
              debtInvoiceIds.includes(inv.id)
            );

            return (
              <div className="space-y-4 py-4">
                {/* Current Debt Status */}
                <div className="p-4 rounded-lg border-2">
                  {isNewDebt ? (
                    <div className="text-center">
                      <DollarSign size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 font-medium">Chưa quản lý nợ</p>
                      <p className="text-sm text-gray-500 mt-1">Lần đầu tiên thêm thông tin nợ</p>
                    </div>
                  ) : hasDebt ? (
                    <div className="text-center">
                      <TrendingUp size={32} className="mx-auto text-red-500 mb-2" />
                      <p className="text-red-600 font-semibold text-lg">Đang nợ</p>
                      <p className="text-2xl font-bold text-red-700 mt-2">
                        {currentDebt.toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  ) : hasOverpayment ? (
                    <div className="text-center">
                      <TrendingDown size={32} className="mx-auto text-blue-500 mb-2" />
                      <p className="text-blue-600 font-semibold text-lg">Thiếu nợ</p>
                      <p className="text-2xl font-bold text-blue-700 mt-2">
                        {Math.abs(currentDebt).toLocaleString('vi-VN')}₫
                      </p>
                      <p className="text-xs text-blue-500 mt-1">(Khách hàng đã trả quá)</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                      <p className="text-green-600 font-semibold text-lg">Đã hết nợ</p>
                      <p className="text-sm text-gray-500 mt-1">Số dư nợ: 0₫</p>
                    </div>
                  )}
                </div>

                 {/* Debt Invoices Selection (if there are debt invoices) */}
                 {debtInvoices.length > 0 && (
                   <div className="space-y-2">
                     <Label>Chọn hóa đơn để trả nợ (tùy chọn)</Label>
                     <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 space-y-2">
                       {debtInvoices.map(invoice => {
                         const isSelected = selectedDebtInvoices.includes(invoice.id);
                         return (
                           <div
                             key={invoice.id}
                             onClick={() => {
                               let updatedSelected: string[];
                               if (isSelected) {
                                 updatedSelected = selectedDebtInvoices.filter(id => id !== invoice.id);
                               } else {
                                 updatedSelected = [...selectedDebtInvoices, invoice.id];
                               }
                               setSelectedDebtInvoices(updatedSelected);
                               
                               // Tự động tính và điền số tiền vào ô nhập
                               if (updatedSelected.length > 0) {
                                 const totalAmount = debtInvoices
                                   .filter(inv => updatedSelected.includes(inv.id))
                                   .reduce((sum, inv) => sum + inv.total, 0);
                                 setDebtAmount(totalAmount.toString());
                                 // Tự động chuyển sang chế độ "Trả nợ" nếu đang ở chế độ "Thêm nợ"
                                 if (debtAction === 'add') {
                                   setDebtAction('pay');
                                 }
                               } else {
                                 // Nếu bỏ chọn hết, xóa số tiền
                                 setDebtAmount('');
                               }
                             }}
                             className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                               isSelected
                                 ? 'border-blue-500 bg-blue-50'
                                 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                             }`}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex-1">
                                 <p className="font-semibold text-sm">
                                   {invoice.invoiceCode || invoice.id}
                                 </p>
                                 <p className="text-xs text-gray-600 mt-0.5">
                                   {new Date(invoice.date + 'T' + invoice.time).toLocaleString('vi-VN')}
                                 </p>
                                 <p className="text-sm font-bold text-gray-900 mt-1">
                                   {invoice.total.toLocaleString('vi-VN')}₫
                                 </p>
                               </div>
                               {isSelected && (
                                 <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                   <div className="w-2 h-2 rounded-full bg-white" />
                                 </div>
                               )}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                     {selectedDebtInvoices.length > 0 && (
                       <p className="text-xs text-blue-600">
                         Đã chọn {selectedDebtInvoices.length} hóa đơn. Tổng tiền: {
                           debtInvoices
                             .filter(inv => selectedDebtInvoices.includes(inv.id))
                             .reduce((sum, inv) => sum + inv.total, 0)
                             .toLocaleString('vi-VN')
                         }₫
                       </p>
                     )}
                   </div>
                 )}

                 {/* Action Selection (only for existing debt management) */}
                 {!isNewDebt && (
                   <div className="space-y-2">
                     <Label>Thao tác</Label>
                     <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={debtAction === 'pay' ? 'default' : 'outline'}
                          onClick={() => {
                            setDebtAction('pay');
                            // Nếu có hóa đơn được chọn, tự động tính tổng tiền
                            if (selectedDebtInvoices.length > 0) {
                              const totalAmount = debtInvoices
                                .filter(inv => selectedDebtInvoices.includes(inv.id))
                                .reduce((sum, inv) => sum + inv.total, 0);
                              setDebtAmount(totalAmount.toString());
                            }
                          }}
                          className="w-full"
                          disabled={!hasDebt} // Disable nếu không có nợ
                        >
                          <TrendingDown size={16} className="mr-2" />
                          Trả nợ
                        </Button>
                        <Button
                          type="button"
                          variant={debtAction === 'add' ? 'default' : 'outline'}
                          onClick={() => {
                            setDebtAction('add');
                            setSelectedDebtInvoices([]); // Xóa lựa chọn khi chuyển sang thêm nợ
                            setDebtAmount(''); // Xóa số tiền khi chuyển sang thêm nợ
                          }}
                          className="w-full"
                        >
                          <TrendingUp size={16} className="mr-2" />
                          Thêm nợ
                        </Button>
                     </div>
                   </div>
                 )}

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="debtAmount">
                    {isNewDebt 
                      ? 'Số nợ còn thiếu *' 
                      : debtAction === 'add' 
                        ? 'Số tiền thêm nợ *' 
                        : 'Số tiền trả nợ *'
                    }
                  </Label>
                  <Input
                    id="debtAmount"
                    type="number"
                    min="0"
                    max={debtAction === 'pay' && !isNewDebt ? (currentDebt || 0) : undefined}
                    step="1000"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    placeholder={debtAction === 'pay' && !isNewDebt ? `Tối đa: ${(currentDebt || 0).toLocaleString('vi-VN')}₫` : "Nhập số tiền"}
                    className="text-lg"
                  />
                  {debtAction === 'pay' && !isNewDebt && currentDebt && currentDebt > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Số nợ hiện tại: <span className="font-semibold">{currentDebt.toLocaleString('vi-VN')}₫</span>
                    </p>
                  )}
                </div>

                {/* Debt Note Input */}
                <div className="space-y-2">
                  <Label htmlFor="debtNote">Ghi chú (tùy chọn)</Label>
                  <Input
                    id="debtNote"
                    type="text"
                    value={debtNote}
                    onChange={(e) => setDebtNote(e.target.value)}
                    placeholder="Nhập ghi chú cho thay đổi này"
                  />
                </div>

                {/* Preview Calculation */}
                {debtAmount && !isNaN(Number(debtAmount)) && Number(debtAmount) > 0 && (
                  <div className={`p-3 rounded-lg border ${
                    (() => {
                      if (isNewDebt || debtAction === 'add') return 'bg-blue-50 border-blue-200';
                      const amount = Number(debtAmount);
                      const currentDebtValue = currentDebt || 0;
                      if (amount > currentDebtValue) return 'bg-red-50 border-red-200';
                      return 'bg-blue-50 border-blue-200';
                    })()
                  }`}>
                    <p className="text-sm text-gray-600 mb-1">Dư nợ sau khi {isNewDebt ? 'thêm' : debtAction === 'add' ? 'thêm nợ' : 'trả nợ'}:</p>
                    {(() => {
                      const amount = Number(debtAmount);
                      let newDebt: number;
                      if (isNewDebt) {
                        newDebt = amount;
                      } else if (debtAction === 'add') {
                        newDebt = (currentDebt || 0) + amount;
                      } else {
                        newDebt = (currentDebt || 0) - amount;
                      }
                      
                      // Kiểm tra nếu trả nợ quá số nợ hiện tại
                      if (debtAction === 'pay' && amount > (currentDebt || 0)) {
                        return (
                          <>
                            <p className="text-lg font-bold text-red-900">
                              {newDebt.toLocaleString('vi-VN')}₫
                            </p>
                            <p className="text-xs text-red-600 mt-1 font-semibold">
                              ⚠️ Số tiền trả nợ không được vượt quá số nợ hiện tại ({currentDebt.toLocaleString('vi-VN')}₫)!
                            </p>
                          </>
                        );
                      }
                      
                      return (
                        <>
                          <p className="text-lg font-bold text-blue-900">
                            {newDebt.toLocaleString('vi-VN')}₫
                          </p>
                          {(() => {
                            if (newDebt > 0) {
                              return <p className="text-xs text-red-600 mt-1">Khách hàng sẽ còn nợ {newDebt.toLocaleString('vi-VN')}₫</p>;
                            } else if (newDebt < 0) {
                              return <p className="text-xs text-blue-600 mt-1">Khách hàng sẽ thiếu nợ {Math.abs(newDebt).toLocaleString('vi-VN')}₫</p>;
                            } else {
                              return <p className="text-xs text-green-600 mt-1">Khách hàng sẽ hết nợ</p>;
                            }
                          })()}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDebtDialogOpen(false);
                setSelectedCustomerForDebt(null);
                setDebtAmount('');
                setDebtAction('pay');
                setDebtNote('');
                setSelectedDebtInvoices([]);
              }}
            >
              Hủy
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedCustomerForDebt) return;
                
                const amount = Number(debtAmount);
                if (!debtAmount || isNaN(amount) || amount <= 0) {
                  await alert({
                    title: 'Thông báo',
                    message: 'Vui lòng nhập số tiền hợp lệ!',
                    variant: 'warning',
                  });
                  return;
                }

                try {
                  const currentDebt = selectedCustomerForDebt.debtAmount;
                  const isNewDebt = currentDebt === undefined;
                  let newDebtAmount: number;
                  let changeAmount: number;
                  let action: 'init' | 'add' | 'pay';

                  if (isNewDebt) {
                    // Lần đầu thêm nợ
                    newDebtAmount = amount;
                    changeAmount = amount;
                    action = 'init';
                  } else if (debtAction === 'add') {
                    // Thêm nợ
                    newDebtAmount = (currentDebt || 0) + amount;
                    changeAmount = amount;
                    action = 'add';
                  } else {
                    // Trả nợ - kiểm tra không được trả quá số nợ hiện tại
                    if (amount > (currentDebt || 0)) {
                      await alert({
                        title: 'Lỗi',
                        message: `Số tiền trả nợ không được vượt quá số nợ hiện tại (${(currentDebt || 0).toLocaleString('vi-VN')}₫)!`,
                        variant: 'warning',
                      });
                      return;
                    }
                    newDebtAmount = (currentDebt || 0) - amount;
                    changeAmount = -amount;
                    action = 'pay';
                  }

                  // Tạo lịch sử mới (loại bỏ undefined values)
                  const newHistoryEntry: any = {
                    id: Date.now().toString(),
                    newAmount: newDebtAmount,
                    changeAmount: changeAmount,
                    action: action,
                    createdAt: new Date(),
                  };
                  
                  // Chỉ thêm previousAmount nếu không phải undefined
                  if (currentDebt !== undefined) {
                    newHistoryEntry.previousAmount = currentDebt;
                  }
                  
                  // Chỉ thêm note nếu có giá trị
                  if (debtNote.trim()) {
                    newHistoryEntry.note = debtNote.trim();
                  }

                  // Cập nhật lịch sử (làm sạch các entry cũ để loại bỏ undefined)
                  const existingHistory = (selectedCustomerForDebt.debtHistory || []).map((entry: any) => {
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

                  // Nếu có hóa đơn được chọn và đang trả nợ, cập nhật các hóa đơn đó
                  if (debtAction === 'pay' && selectedDebtInvoices.length > 0) {
                    // Lọc các hóa đơn chưa được trả nợ (paymentMethod vẫn là 'debt')
                    const unpaidDebtInvoices = selectedDebtInvoices.filter(invoiceId => {
                      const inv = invoices.find(i => i.id === invoiceId);
                      return inv && inv.paymentMethod === 'debt';
                    });
                    
                    // Tính tổng tiền của các hóa đơn chưa được trả nợ
                    const selectedInvoicesTotal = unpaidDebtInvoices.reduce((sum, invoiceId) => {
                      const inv = invoices.find(i => i.id === invoiceId);
                      return sum + (inv?.total || 0);
                    }, 0);
                    
                    // Cập nhật paymentMethod của các hóa đơn được chọn từ 'debt' sang 'cash'
                    for (const invoiceId of selectedDebtInvoices) {
                      try {
                        await updateInvoice(invoiceId, {
                          paymentMethod: 'cash',
                        });
                      } catch (invoiceError) {
                        console.error(`Error updating invoice ${invoiceId}:`, invoiceError);
                        // Tiếp tục với các hóa đơn khác
                      }
                    }
                    
                    // Xóa các invoiceId khỏi danh sách hóa đơn nợ
                    const existingDebtInvoiceIds = selectedCustomerForDebt.debtInvoiceIds || [];
                    const updatedDebtInvoiceIds = existingDebtInvoiceIds.filter(id => !selectedDebtInvoices.includes(id));
                    
                    // Cập nhật note với danh sách hóa đơn đã trả
                    const invoiceCodes = selectedDebtInvoices.map(id => {
                      const inv = invoices.find(i => i.id === id);
                      return inv?.invoiceCode || inv?.id || id;
                    }).join(', ');
                    newHistoryEntry.note = debtNote.trim() 
                      ? `${debtNote.trim()} (Đã trả hóa đơn: ${invoiceCodes})`
                      : `Đã trả hóa đơn: ${invoiceCodes}`;

                    // KHÔNG cập nhật thống kê mua hàng khi trả nợ
                    // Vì hóa đơn nợ đã được tính vào thống kê khi tạo (trong POS.tsx)
                    // Nếu cập nhật lại ở đây sẽ bị cộng trùng
                    // Chỉ cập nhật dư nợ và danh sách hóa đơn nợ
                    await updateCustomer(selectedCustomerForDebt.id, {
                      debtAmount: newDebtAmount,
                      debtHistory: updatedHistory,
                      debtInvoiceIds: updatedDebtInvoiceIds,
                    });
                  } else {
                    // Lưu vào Firestore (không có hóa đơn được chọn)
                    await updateCustomer(selectedCustomerForDebt.id, {
                      debtAmount: newDebtAmount,
                      debtHistory: updatedHistory,
                    });
                  }

                  await alert({
                    title: 'Thành công',
                    message: 'Cập nhật dư nợ thành công!',
                    variant: 'success',
                  });

                  // Đóng dialog và reset
                  setIsDebtDialogOpen(false);
                  setSelectedCustomerForDebt(null);
                  setDebtAmount('');
                  setDebtAction('pay');
                  setDebtNote('');
                  setSelectedDebtInvoices([]);
                } catch (error: any) {
                  console.error('Error updating debt:', error);
                  await alert({
                    title: 'Lỗi',
                    message: 'Không thể cập nhật dư nợ. Vui lòng thử lại.',
                    variant: 'danger',
                  });
                }
              }}
              disabled={
                !debtAmount || 
                Number(debtAmount) <= 0 || 
                isNaN(Number(debtAmount)) ||
                (debtAction === 'pay' && Number(debtAmount) > (selectedCustomerForDebt?.debtAmount || 0))
              }
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debt History Dialog */}
      <Dialog open={isDebtHistoryDialogOpen} onOpenChange={setIsDebtHistoryDialogOpen}>
        <DialogContent 
          className="!max-w-6xl !w-[95vw] !h-[85vh] !flex !flex-col !grid-cols-none !p-6"
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            maxWidth: '1152px',
            width: '95vw',
            height: '85vh',
            maxHeight: '85vh'
          }}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Lịch Sử Dư Nợ</DialogTitle>
            <DialogDescription>
              {selectedCustomerForDebt && `Khách hàng: ${selectedCustomerForDebt.name}`}
            </DialogDescription>
          </DialogHeader>
          
          <div 
            className="flex-1 overflow-hidden flex flex-col min-h-0 mt-4"
            style={{ 
              minHeight: 0,
              flex: '1 1 auto',
              overflow: 'hidden'
            }}
          >
            {selectedCustomerForDebt && selectedCustomerForDebt.debtHistory && selectedCustomerForDebt.debtHistory.length > 0 ? (
              <div 
                className="border rounded-lg overflow-hidden flex-1 flex flex-col"
                style={{ 
                  minHeight: 0,
                  flex: '1 1 auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div 
                  className="overflow-y-auto overflow-x-auto flex-1"
                  style={{ 
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'auto'
                  }}
                >
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                      <TableRow>
                        <TableHead className="px-4 py-3 font-semibold text-gray-900 min-w-[150px] whitespace-nowrap">Thời gian</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-gray-900 min-w-[120px] whitespace-nowrap">Loại</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-gray-900 min-w-[150px] text-right whitespace-nowrap">Nợ trước</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-gray-900 min-w-[150px] text-right whitespace-nowrap">Thay đổi</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-gray-900 min-w-[150px] text-right whitespace-nowrap">Nợ sau</TableHead>
                        <TableHead className="px-4 py-3 font-semibold text-gray-900 min-w-[250px]">Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCustomerForDebt.debtHistory.map((history, index) => (
                        <TableRow 
                          key={history.id || index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-700">
                              {history.createdAt instanceof Date
                                ? history.createdAt.toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : new Date(history.createdAt).toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {history.action === 'init' ? (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium whitespace-nowrap">
                                Khởi tạo
                              </span>
                            ) : history.action === 'add' ? (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded font-medium flex items-center gap-1 w-fit whitespace-nowrap">
                                <TrendingUp size={12} />
                                Thêm nợ
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium flex items-center gap-1 w-fit whitespace-nowrap">
                                <TrendingDown size={12} />
                                Trả nợ
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                            {history.previousAmount !== undefined ? (
                              <span className="text-sm font-medium text-gray-700">
                                {history.previousAmount.toLocaleString('vi-VN')}₫
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">--</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={`text-sm font-semibold ${
                              history.changeAmount > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {history.changeAmount > 0 ? '+' : ''}
                              {history.changeAmount.toLocaleString('vi-VN')}₫
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={`text-sm font-bold ${
                              history.newAmount > 0 ? 'text-red-700' : 
                              history.newAmount < 0 ? 'text-blue-700' : 
                              'text-green-700'
                            }`}>
                              {history.newAmount.toLocaleString('vi-VN')}₫
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {history.note ? (
                              <div className="flex items-start gap-2">
                                <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-700 break-words">{history.note}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">--</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 flex-1 flex items-center justify-center">
                <div>
                  <History size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Chưa có lịch sử dư nợ</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setIsDebtHistoryDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertComponent />
    </div>
  );
}

