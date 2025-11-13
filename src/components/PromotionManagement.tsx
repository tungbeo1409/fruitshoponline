import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit, Trash2, Tag, TrendingUp, Search, Filter, ArrowUpDown, X, Loader2, StopCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { ConfirmDialog } from './ConfirmDialog';
import { useAlert } from './AlertDialog';
import { usePromotions, Promotion } from '../hooks/usePromotions';
import { useProducts } from '../hooks/useProducts';
import { useCustomers } from '../hooks/useCustomers';

export function PromotionManagement() {
  const { alert, AlertComponent } = useAlert();
  
  // Firestore hooks
  const { promotions, loading, addPromotion, updatePromotion, deletePromotion } = usePromotions();
  const { products } = useProducts();
  const { customers } = useCustomers();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'date-asc' | 'date-desc' | 'value'>('name');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'percent' as 'percent' | 'fixed' | 'buy_get',
    value: '',
    minPurchase: '',
    quantity: '', // Số lượng khuyến mãi (0 = không giới hạn)
    startDate: '',
    endDate: '',
    description: '',
    productIds: null as string[] | null,
    customerIds: null as string[] | null,
    applyToAllProducts: true,
    applyToAllCustomers: true,
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (isDialogOpen && editingPromotion) {
      const applyToAllProducts = editingPromotion.productIds === null;
      const applyToAllCustomers = editingPromotion.customerIds === null;
      setFormData({
        name: editingPromotion.name,
        type: editingPromotion.type,
        value: editingPromotion.value.toString(),
        minPurchase: editingPromotion.minPurchase.toString(),
        quantity: (editingPromotion.quantity || 0).toString(),
        startDate: editingPromotion.startDate,
        endDate: editingPromotion.endDate,
        description: editingPromotion.description,
        productIds: editingPromotion.productIds,
        customerIds: editingPromotion.customerIds,
        applyToAllProducts,
        applyToAllCustomers,
      });
      setSelectedProductIds(editingPromotion.productIds || []);
      setSelectedCustomerIds(editingPromotion.customerIds || []);
    } else if (isDialogOpen && !editingPromotion) {
      setFormData({
        name: '',
        type: 'percent',
        value: '',
        minPurchase: '',
        quantity: '0', // 0 = không giới hạn
        startDate: '',
        endDate: '',
        description: '',
        productIds: null,
        customerIds: null,
        applyToAllProducts: true,
        applyToAllCustomers: true,
      });
      setSelectedProductIds([]);
      setSelectedCustomerIds([]);
    }
  }, [isDialogOpen, editingPromotion]);

  // Filter and sort promotions
  const filteredPromotions = promotions
    .filter(promotion => {
      const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotion.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(promotion.type);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(promotion.status);
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
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

  const handleOpenDialog = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
    } else {
      setEditingPromotion(null);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.value || !formData.startDate || !formData.endDate) {
      await alert({
        title: 'Thông báo',
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc!',
        variant: 'warning',
      });
      return;
    }

    try {
      const promotionData = {
      name: formData.name,
      type: formData.type,
      value: Number(formData.value),
        minPurchase: Number(formData.minPurchase) || 0,
        quantity: Number(formData.quantity) || 0, // 0 = không giới hạn
      startDate: formData.startDate,
      endDate: formData.endDate,
      description: formData.description,
        productIds: formData.applyToAllProducts ? null : selectedProductIds,
        customerIds: formData.applyToAllCustomers ? null : selectedCustomerIds,
    };

    if (editingPromotion) {
        await updatePromotion(editingPromotion.id, promotionData);
    } else {
        await addPromotion(promotionData);
    }

    setIsDialogOpen(false);
      setEditingPromotion(null);
    } catch (error: any) {
      await alert({
        title: 'Lỗi',
        message: 'Không thể lưu khuyến mãi. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const handleEnd = async (id: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await updatePromotion(id, { 
        endDate: today,
        status: 'expired'
      });
      await alert({
        title: 'Thành công',
        message: 'Đã kết thúc khuyến mãi.',
        variant: 'success',
      });
    } catch (error: any) {
      await alert({
        title: 'Lỗi',
        message: 'Không thể kết thúc khuyến mãi. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const getStatusBadge = (status: Promotion['status']) => {
    const variants = {
      active: { variant: 'default' as const, label: 'Đang áp dụng' },
      inactive: { variant: 'secondary' as const, label: 'Chưa bắt đầu' },
      expired: { variant: 'destructive' as const, label: 'Đã hết hạn' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTypeLabel = (type: Promotion['type']) => {
    const labels = {
      percent: 'Giảm %',
      fixed: 'Giảm tiền',
      buy_get: 'Mua X tặng Y',
    };
    return labels[type];
  };

  const activePromotions = promotions.filter(p => p.status === 'active').length;
  const totalDiscount = promotions
    .filter(p => p.status === 'active')
    .reduce((sum, p) => sum + (p.type === 'fixed' ? p.value : 0), 0);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản Lý Khuyến Mãi</h1>
            <p className="text-gray-500 mt-1">Quản lý các chương trình khuyến mãi</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2" size={18} />
            Thêm Khuyến Mãi
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Tag className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600">Tổng khuyến mãi</p>
                <p className="text-2xl font-bold text-gray-900">{promotions.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600">Đang áp dụng</p>
                <p className="text-2xl font-bold text-gray-900">{activePromotions}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Tag className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-gray-600">Tổng giảm giá</p>
                <p className="text-2xl font-bold text-gray-900">{totalDiscount.toLocaleString('vi-VN')}₫</p>
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
                placeholder="Tìm kiếm khuyến mãi..."
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
                    {['percent', 'fixed', 'buy_get'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTypes([...selectedTypes, type]);
                            } else {
                              setSelectedTypes(selectedTypes.filter(t => t !== type));
                            }
                          }}
                        />
                        <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer">
                          {type === 'percent' ? 'Giảm %' : type === 'fixed' ? 'Giảm tiền' : 'Mua X tặng Y'}
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
                          id={`status-${status}`}
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStatuses([...selectedStatuses, status]);
                            } else {
                              setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                            }
                          }}
                        />
                        <Label htmlFor={`status-${status}`} className="text-sm font-normal cursor-pointer">
                          {status === 'active' ? 'Đang áp dụng' : status === 'inactive' ? 'Chưa bắt đầu' : 'Đã hết hạn'}
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
                <SelectItem value="name">Tên A-Z</SelectItem>
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

        {/* Promotions Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">
              {searchTerm ? 'Không tìm thấy khuyến mãi nào' : 'Chưa có khuyến mãi nào'}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPromotions.map(promotion => (
            <Card key={promotion.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                      <h3 className="text-gray-900 font-semibold">{promotion.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{promotion.description}</p>
                  </div>
                  {getStatusBadge(promotion.status)}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{getTypeLabel(promotion.type)}</Badge>
                    <div className="text-right">
                        <p className="text-gray-900 font-semibold">
                        {promotion.type === 'percent' && `${promotion.value}%`}
                        {promotion.type === 'fixed' && `${promotion.value.toLocaleString('vi-VN')}₫`}
                        {promotion.type === 'buy_get' && `Tặng ${promotion.value}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Điều kiện:</span>
                      <span>
                        {promotion.minPurchase > 0 
                          ? `Từ ${promotion.minPurchase.toLocaleString('vi-VN')}₫`
                          : 'Không yêu cầu'
                        }
                      </span>
                    </div>
                      {promotion.quantity > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Số lượng:</span>
                          <span className="text-xs text-gray-500">
                            {promotion.used}/{promotion.quantity} lượt đã dùng
                          </span>
                        </div>
                      )}
                    <div className="flex justify-between text-gray-600">
                      <span>Thời gian:</span>
                      <span className="text-right">
                        {new Date(promotion.startDate).toLocaleDateString('vi-VN')} - {new Date(promotion.endDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Sản phẩm:</span>
                        <span className="text-right text-xs">
                          {promotion.productIds === null ? 'Tất cả' : `${promotion.productIds.length} sản phẩm`}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Khách hàng:</span>
                        <span className="text-right text-xs">
                          {promotion.customerIds === null ? 'Tất cả' : `${promotion.customerIds.length} khách hàng`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(promotion)}
                    className="flex-1"
                  >
                    <Edit size={14} className="mr-2" />
                    Sửa
                  </Button>
                  {promotion.status !== 'expired' && (
                  <Button
                    size="sm"
                    variant="outline"
                      onClick={() => handleEnd(promotion.id)}
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
              {editingPromotion ? 'Chỉnh Sửa Khuyến Mãi' : 'Thêm Khuyến Mãi Mới'}
            </DialogTitle>
            <DialogDescription>
              {editingPromotion ? 'Cập nhật thông tin khuyến mãi' : 'Nhập thông tin khuyến mãi mới'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Tên chương trình *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Giảm 20% Cuối Tuần"
              />
            </div>
            <div>
              <Label className="mb-2 block">Mô tả</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả ngắn về chương trình"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Loại khuyến mãi *</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Giảm %</SelectItem>
                    <SelectItem value="fixed">Giảm tiền</SelectItem>
                    <SelectItem value="buy_get">Mua X tặng Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">
                  {formData.type === 'percent' && 'Phần trăm (%) *'}
                  {formData.type === 'fixed' && 'Số tiền (₫) *'}
                  {formData.type === 'buy_get' && 'Số lượng tặng *'}
                </Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Giá trị đơn hàng tối thiểu (₫)</Label>
              <Input
                type="number"
                value={formData.minPurchase}
                onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="mb-2 block">Số lượng khuyến mãi</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0 (không giới hạn)"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Nhập 0 để không giới hạn số lần sử dụng</p>
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
                    id="apply-all-products"
                    checked={formData.applyToAllProducts}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, applyToAllProducts: !!checked });
                      if (checked) {
                        setSelectedProductIds([]);
                      }
                    }}
                  />
                  <Label htmlFor="apply-all-products" className="text-sm font-normal cursor-pointer">
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
                            id={`product-${product.id}`}
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProductIds([...selectedProductIds, product.id]);
                              } else {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                              }
                            }}
                          />
                          <Label htmlFor={`product-${product.id}`} className="text-sm font-normal cursor-pointer flex-1">
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
                    id="apply-all-customers"
                    checked={formData.applyToAllCustomers}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, applyToAllCustomers: !!checked });
                      if (checked) {
                        setSelectedCustomerIds([]);
                      }
                    }}
                  />
                  <Label htmlFor="apply-all-customers" className="text-sm font-normal cursor-pointer">
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
                            id={`customer-${customer.id}`}
                            checked={selectedCustomerIds.includes(customer.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCustomerIds([...selectedCustomerIds, customer.id]);
                              } else {
                                setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== customer.id));
                              }
                            }}
                          />
                          <Label htmlFor={`customer-${customer.id}`} className="text-sm font-normal cursor-pointer flex-1">
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
              {editingPromotion ? 'Cập Nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Alert Component */}
      <AlertComponent />
    </div>
  );
}
