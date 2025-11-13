import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Search, Plus, Edit, Users, Filter, Loader2, Eye, EyeOff, RotateCcw, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { ImageCropper } from './ImageCropper';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ConfirmDialog } from './ConfirmDialog';
import { useAlert } from './AlertDialog';
import { useCustomers, Customer } from '../hooks/useCustomers';

export function CustomerManagement() {
  const { alert, AlertComponent } = useAlert();
  
  // Firestore hooks
  const { customers, loading, addCustomer, updateCustomer } = useCustomers();
  
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
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'phone':
          return (a.phone || '').localeCompare(b.phone || '');
        case 'email':
          return (a.email || '').localeCompare(b.email || '');
        default:
          return 0;
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
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  {customer.isActive === false ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReactivate(customer.id)}
                      className="flex-1 gap-1"
                    >
                      <RotateCcw size={14} />
                      Hoạt động lại
                    </Button>
                  ) : (
                    <>
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

      <AlertComponent />
    </div>
  );
}

