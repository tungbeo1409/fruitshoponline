import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit, Trash2, Ticket, Copy, Check, Search, Filter, ArrowUpDown, X, Loader2, StopCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { ConfirmDialog } from './ConfirmDialog';
import { useAlert } from './AlertDialog';
import { useVouchers, Voucher } from '../hooks/useVouchers';
import { useProducts } from '../hooks/useProducts';
import { useCustomers } from '../hooks/useCustomers';

export function VoucherManagement() {
  const { alert, AlertComponent } = useAlert();
  
  // Firestore hooks
  const { vouchers, loading, addVoucher, updateVoucher, deleteVoucher } = useVouchers();
  const { products } = useProducts();
  const { customers } = useCustomers();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'code' | 'date-asc' | 'date-desc' | 'value'>('code');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    minPurchase: '',
    maxDiscount: '',
    quantity: '',
    startDate: '',
    endDate: '',
    productIds: null as string[] | null,
    customerIds: null as string[] | null,
    applyToAllProducts: true,
    applyToAllCustomers: true,
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (isDialogOpen && editingVoucher) {
      const applyToAllProducts = editingVoucher.productIds === null;
      const applyToAllCustomers = editingVoucher.customerIds === null;
      setFormData({
        code: editingVoucher.code,
        type: editingVoucher.type,
        value: editingVoucher.value.toString(),
        minPurchase: editingVoucher.minPurchase.toString(),
        maxDiscount: editingVoucher.maxDiscount?.toString() || '',
        quantity: editingVoucher.quantity.toString(),
        startDate: editingVoucher.startDate,
        endDate: editingVoucher.endDate,
        productIds: editingVoucher.productIds,
        customerIds: editingVoucher.customerIds,
        applyToAllProducts,
        applyToAllCustomers,
      });
      setSelectedProductIds(editingVoucher.productIds || []);
      setSelectedCustomerIds(editingVoucher.customerIds || []);
    } else if (isDialogOpen && !editingVoucher) {
      setFormData({
        code: '',
        type: 'percent',
        value: '',
        minPurchase: '',
        maxDiscount: '',
        quantity: '',
        startDate: '',
        endDate: '',
        productIds: null,
        customerIds: null,
        applyToAllProducts: true,
        applyToAllCustomers: true,
      });
      setSelectedProductIds([]);
      setSelectedCustomerIds([]);
    }
  }, [isDialogOpen, editingVoucher]);

  // Filter and sort vouchers
  const filteredVouchers = vouchers
    .filter(voucher => {
      const matchesSearch = voucher.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(voucher.type);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(voucher.status);
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'code':
          return a.code.localeCompare(b.code);
        case 'date-asc':
          return a.startDate.localeCompare(b.startDate);
        case 'date-desc':
          return b.startDate.localeCompare(a.startDate);
        case 'value':
          return b.value - a.value;
        default:
          return 0;
      }
    });

  const handleOpenDialog = (voucher?: Voucher) => {
    if (voucher) {
      setEditingVoucher(voucher);
    } else {
      setEditingVoucher(null);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.code || !formData.value || !formData.quantity || !formData.startDate || !formData.endDate) {
      await alert({
        title: 'Thông báo',
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc!',
        variant: 'warning',
      });
      return;
    }

    // Validate value
    const value = Number(formData.value);
    if (isNaN(value) || value <= 0) {
      await alert({
        title: 'Lỗi',
        message: 'Giá trị voucher phải lớn hơn 0!',
        variant: 'danger',
      });
      return;
    }

    // Validate quantity
    const quantity = Number(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      await alert({
        title: 'Lỗi',
        message: 'Số lượng voucher phải lớn hơn 0!',
        variant: 'danger',
      });
      return;
    }

    // Validate dates
    if (formData.startDate > formData.endDate) {
      await alert({
        title: 'Lỗi',
        message: 'Ngày kết thúc phải sau ngày bắt đầu!',
        variant: 'danger',
      });
      return;
    }

    // Validate percent type
    if (formData.type === 'percent' && value > 100) {
      await alert({
        title: 'Lỗi',
        message: 'Giá trị phần trăm không được vượt quá 100%!',
        variant: 'danger',
      });
      return;
    }

    // Validate selected products/customers
    if (!formData.applyToAllProducts && selectedProductIds.length === 0) {
      await alert({
        title: 'Lỗi',
        message: 'Vui lòng chọn ít nhất một sản phẩm hoặc chọn "Áp dụng cho tất cả sản phẩm"!',
        variant: 'danger',
      });
      return;
    }

    if (!formData.applyToAllCustomers && selectedCustomerIds.length === 0) {
      await alert({
        title: 'Lỗi',
        message: 'Vui lòng chọn ít nhất một khách hàng hoặc chọn "Áp dụng cho tất cả khách hàng"!',
        variant: 'danger',
      });
      return;
    }

    // Check for duplicate code (only when creating new voucher)
    if (!editingVoucher) {
      const codeUpper = formData.code.toUpperCase().trim();
      const existingVoucher = vouchers.find(v => v.code.toUpperCase() === codeUpper);
      if (existingVoucher) {
        await alert({
          title: 'Lỗi',
          message: `Mã voucher "${codeUpper}" đã tồn tại! Vui lòng chọn mã khác.`,
          variant: 'danger',
        });
        return;
      }
    } else {
      // When editing, check if code conflicts with other vouchers
      const codeUpper = formData.code.toUpperCase().trim();
      const existingVoucher = vouchers.find(v => v.id !== editingVoucher.id && v.code.toUpperCase() === codeUpper);
      if (existingVoucher) {
        await alert({
          title: 'Lỗi',
          message: `Mã voucher "${codeUpper}" đã tồn tại! Vui lòng chọn mã khác.`,
          variant: 'danger',
        });
        return;
      }
    }

    try {
      // Build voucher data object, only include maxDiscount if it has a value
      const voucherData: any = {
        code: formData.code.toUpperCase().trim(),
        type: formData.type,
        value: value,
        minPurchase: Number(formData.minPurchase) || 0,
        quantity: quantity,
        startDate: formData.startDate,
        endDate: formData.endDate,
        productIds: formData.applyToAllProducts ? null : (selectedProductIds.length > 0 ? selectedProductIds : null),
        customerIds: formData.applyToAllCustomers ? null : (selectedCustomerIds.length > 0 ? selectedCustomerIds : null),
      };

      // Only add maxDiscount if it has a value (not undefined)
      if (formData.maxDiscount && formData.maxDiscount.trim() !== '') {
        const maxDiscountValue = Number(formData.maxDiscount);
        if (!isNaN(maxDiscountValue) && maxDiscountValue > 0) {
          voucherData.maxDiscount = maxDiscountValue;
        }
      }

      if (editingVoucher) {
        await updateVoucher(editingVoucher.id, voucherData);
        await alert({
          title: 'Thành công',
          message: 'Đã cập nhật voucher thành công!',
          variant: 'success',
        });
      } else {
        await addVoucher(voucherData);
        await alert({
          title: 'Thành công',
          message: 'Đã tạo voucher thành công!',
          variant: 'success',
        });
      }

      setIsDialogOpen(false);
      setEditingVoucher(null);
    } catch (error: any) {
      console.error('Error saving voucher:', error);
      await alert({
        title: 'Lỗi',
        message: error.message || 'Không thể lưu voucher. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const handleEnd = async (id: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateVoucher(id, { 
        endDate: today,
        status: 'expired'
      });
      await alert({
        title: 'Thành công',
        message: 'Đã kết thúc voucher.',
        variant: 'success',
      });
    } catch (error: any) {
      await alert({
        title: 'Lỗi',
        message: 'Không thể kết thúc voucher. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (status: Voucher['status']) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Đang hoạt động' },
      inactive: { variant: 'secondary' as const, label: 'Chưa bắt đầu' },
      expired: { variant: 'destructive' as const, label: 'Đã hết hạn' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const activeVouchers = vouchers.filter(v => v.status === 'active').length;
  const totalVouchers = vouchers.reduce((sum, v) => sum + v.quantity, 0);
  const totalUsed = vouchers.reduce((sum, v) => sum + v.used, 0);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản Lý Voucher</h1>
            <p className="text-gray-500 mt-1">Quản lý các mã giảm giá voucher</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2" size={18} />
            Tạo Voucher
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Ticket className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600">Tổng voucher</p>
                <p className="text-2xl font-bold text-gray-900">{vouchers.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Ticket className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600">Đang hoạt động</p>
                <p className="text-2xl font-bold text-gray-900">{activeVouchers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Ticket className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600">Tổng phát hành</p>
                <p className="text-2xl font-bold text-gray-900">{totalVouchers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Ticket className="text-orange-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600">Đã sử dụng</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsed}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search, Filters and Add */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Tìm kiếm mã voucher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters and Sort */}
          <div className="flex gap-3 items-center flex-wrap">
            {/* Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter size={16} />
                  Loại
                  {selectedTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedTypes.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Lọc theo loại</Label>
                  <div className="space-y-2">
                    {['percent', 'fixed'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vtype-${type}`}
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTypes([...selectedTypes, type]);
                            } else {
                              setSelectedTypes(selectedTypes.filter(t => t !== type));
                            }
                          }}
                        />
                        <Label htmlFor={`vtype-${type}`} className="text-sm font-normal cursor-pointer">
                          {type === 'percent' ? 'Giảm %' : 'Giảm tiền'}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedTypes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedTypes([])}
                    >
                      <X size={14} className="mr-2" />
                      Xóa bộ lọc
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Status Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter size={16} />
                  Trạng thái
                  {selectedStatuses.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedStatuses.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Lọc theo trạng thái</Label>
                  <div className="space-y-2">
                    {['active', 'inactive', 'expired'].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vstatus-${status}`}
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStatuses([...selectedStatuses, status]);
                            } else {
                              setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                            }
                          }}
                        />
                        <Label htmlFor={`vstatus-${status}`} className="text-sm font-normal cursor-pointer">
                          {status === 'active' ? 'Đang hoạt động' : status === 'inactive' ? 'Chưa bắt đầu' : 'Đã hết hạn'}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedStatuses.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedStatuses([])}
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
                <SelectItem value="code">Mã A-Z</SelectItem>
                <SelectItem value="date-asc">Ngày tăng dần</SelectItem>
                <SelectItem value="date-desc">Ngày giảm dần</SelectItem>
                <SelectItem value="value">Giá trị</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {(selectedTypes.length > 0 || selectedStatuses.length > 0 || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedTypes([]);
                  setSelectedStatuses([]);
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

        {/* Vouchers Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">
              {searchTerm ? 'Không tìm thấy voucher nào' : 'Chưa có voucher nào'}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVouchers.map(voucher => (
            <Card key={voucher.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                      <code className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded font-semibold">{voucher.code}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(voucher.code)}
                      className="h-7 w-7 p-0"
                    >
                      {copiedCode === voucher.code ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  </div>
                  {getStatusBadge(voucher.status)}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">
                      {voucher.type === 'percent' ? 'Giảm %' : 'Giảm tiền'}
                    </Badge>
                    <div className="text-right">
                        <p className="text-gray-900 font-semibold">
                        {voucher.type === 'percent' 
                          ? `${voucher.value}%`
                          : `${voucher.value.toLocaleString('vi-VN')}₫`
                        }
                      </p>
                      {voucher.maxDiscount && (
                        <p className="text-xs text-gray-500">Tối đa {voucher.maxDiscount.toLocaleString('vi-VN')}₫</p>
                      )}
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Đơn tối thiểu:</span>
                      <span>
                        {voucher.minPurchase > 0 
                          ? `${voucher.minPurchase.toLocaleString('vi-VN')}₫`
                          : 'Không yêu cầu'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Thời gian:</span>
                      <span className="text-right">
                        {new Date(voucher.startDate).toLocaleDateString('vi-VN')} - {new Date(voucher.endDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Sản phẩm:</span>
                        <span className="text-right text-xs">
                          {voucher.productIds === null ? 'Tất cả' : `${voucher.productIds.length} sản phẩm`}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Khách hàng:</span>
                        <span className="text-right text-xs">
                          {voucher.customerIds === null ? 'Tất cả' : `${voucher.customerIds.length} khách hàng`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Đã sử dụng</span>
                      <span className="text-gray-900">{voucher.used}/{voucher.quantity}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(voucher.used / voucher.quantity) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(voucher)}
                    className="flex-1"
                  >
                    <Edit size={14} className="mr-2" />
                    Sửa
                  </Button>
                  {voucher.status !== 'expired' && (
                  <Button
                    size="sm"
                    variant="outline"
                      onClick={() => handleEnd(voucher.id)}
                      className="text-orange-500 hover:text-orange-600 flex-1"
                  >
                      <StopCircle size={14} className="mr-2" />
                      Kết thúc
                  </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVoucher ? 'Chỉnh Sửa Voucher' : 'Tạo Voucher Mới'}
            </DialogTitle>
            <DialogDescription>
              {editingVoucher ? 'Cập nhật thông tin voucher' : 'Nhập thông tin voucher mới'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Mã voucher *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="VD: GIAM20"
                disabled={!!editingVoucher}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Loại giảm giá *</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Giảm %</SelectItem>
                    <SelectItem value="fixed">Giảm tiền</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">
                  {formData.type === 'percent' ? 'Phần trăm (%) *' : 'Số tiền (₫) *'}
                </Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Đơn tối thiểu (₫)</Label>
                <Input
                  type="number"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-2 block">Giảm tối đa (₫)</Label>
                <Input
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  placeholder="Không giới hạn"
                  disabled={formData.type === 'fixed'}
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Số lượng phát hành *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Ngày bắt đầu *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-2 block">Ngày kết thúc *</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Áp dụng cho sản phẩm</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="apply-all-products-voucher"
                    checked={formData.applyToAllProducts}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, applyToAllProducts: !!checked });
                      if (checked) {
                        setSelectedProductIds([]);
                      }
                    }}
                  />
                  <Label htmlFor="apply-all-products-voucher" className="text-sm font-normal cursor-pointer">
                    Áp dụng cho tất cả
                  </Label>
                </div>
              </div>
              {!formData.applyToAllProducts && (
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {products.length === 0 ? (
                      <p className="text-sm text-gray-500">Chưa có sản phẩm nào</p>
                    ) : (
                      products.map((product) => (
                        <div key={product.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`vproduct-${product.id}`}
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProductIds([...selectedProductIds, product.id]);
                              } else {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                              }
                            }}
                          />
                          <Label htmlFor={`vproduct-${product.id}`} className="text-sm font-normal cursor-pointer flex-1">
                            {product.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Customer Selection */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Áp dụng cho khách hàng</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="apply-all-customers-voucher"
                    checked={formData.applyToAllCustomers}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, applyToAllCustomers: !!checked });
                      if (checked) {
                        setSelectedCustomerIds([]);
                      }
                    }}
                  />
                  <Label htmlFor="apply-all-customers-voucher" className="text-sm font-normal cursor-pointer">
                    Áp dụng cho tất cả
                  </Label>
                </div>
              </div>
              {!formData.applyToAllCustomers && (
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {customers.length === 0 ? (
                      <p className="text-sm text-gray-500">Chưa có khách hàng nào</p>
                    ) : (
                      customers.map((customer) => (
                        <div key={customer.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`vcustomer-${customer.id}`}
                            checked={selectedCustomerIds.includes(customer.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCustomerIds([...selectedCustomerIds, customer.id]);
                              } else {
                                setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== customer.id));
                              }
                            }}
                          />
                          <Label htmlFor={`vcustomer-${customer.id}`} className="text-sm font-normal cursor-pointer flex-1">
                            {customer.name} {customer.phone && `(${customer.phone})`}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave}>
              {editingVoucher ? 'Cập Nhật' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Alert Component */}
      <AlertComponent />
    </div>
  );
}
