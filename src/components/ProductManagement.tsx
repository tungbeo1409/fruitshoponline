import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Search, Plus, Edit, Trash2, Package, Filter, ArrowUpDown, X, Loader2, MoreVertical, PackagePlus } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { ConfirmDialog } from './ConfirmDialog';
import { useAlert } from './AlertDialog';
import { useProducts, Product } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useSuppliers } from '../hooks/useSuppliers';
import { useUnits } from '../hooks/useUnits';
import { ProductSettingsDialog } from './ProductSettingsDialog';
import { ImageCropper } from './ImageCropper';

export function ProductManagement() {
  const { alert, AlertComponent } = useAlert();
  
  // Firestore hooks
  const { products, loading: productsLoading, addProduct, updateProduct, deleteProduct } = useProducts();
  const { categories } = useCategories();
  const { suppliers } = useSuppliers();
  const { units } = useUnits();
  
  // Settings dialog state
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'stock'>('name');
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importingProduct, setImportingProduct] = useState<Product | null>(null);
  const [importQuantity, setImportQuantity] = useState('');
  const [productFormData, setProductFormData] = useState({
    name: '',
    price: '',
    importPrice: '',
    unit: 'kg',
    category: '',
    stock: '',
    supplier: '',
    image: '',
  });

  // Initialize form data when dialog opens
  useEffect(() => {
    if (isProductDialogOpen && !editingProduct) {
      // Reset form when opening dialog for new product
      if (categories.length > 0) {
        setProductFormData(prev => ({ ...prev, category: categories[0].name }));
      }
      if (suppliers.length > 0) {
        setProductFormData(prev => ({ ...prev, supplier: suppliers[0].name }));
      }
      if (units.length > 0) {
        setProductFormData(prev => ({ ...prev, unit: units[0].id }));
      }
    }
  }, [isProductDialogOpen, editingProduct, categories, suppliers, units]);

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
      const matchesSupplier = selectedSuppliers.length === 0 || selectedSuppliers.includes(product.supplier);
      return matchesSearch && matchesCategory && matchesSupplier;
    })
    .sort((a, b) => {
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

  // Product handlers
  const handleOpenProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      // Find unit by symbol or name to get the ID
      const productUnit = units.find(u => u.symbol === product.unit || u.name === product.unit);
      setProductFormData({
        name: product.name,
        price: product.price.toString(),
        importPrice: product.importPrice.toString(),
        unit: productUnit?.id || product.unit, // Use unit ID if found, otherwise keep original
        category: product.category,
        stock: product.stock.toString(),
        supplier: product.supplier,
        image: product.image,
      });
    } else {
      setEditingProduct(null);
      // Reset form with default values
      const defaultUnit = units.length > 0 ? units[0].id : '';
      const defaultCategory = categories.length > 0 ? categories[0].name : '';
      const defaultSupplier = suppliers.length > 0 ? suppliers[0].name : '';
      
      setProductFormData({
        name: '',
        price: '',
        importPrice: '',
        unit: defaultUnit,
        category: defaultCategory,
        stock: '',
        supplier: defaultSupplier,
        image: '',
      });
    }
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productFormData.name || !productFormData.price || !productFormData.stock) {
      await alert({
        title: 'Thông báo',
        message: 'Vui lòng điền đầy đủ thông tin!',
        variant: 'warning',
      });
      return;
    }

    try {
      // Get unit symbol from unit ID
      const selectedUnit = units.find(u => u.id === productFormData.unit);
      const unitSymbol = selectedUnit?.symbol || selectedUnit?.name || '';
      
      const productData = {
        name: productFormData.name,
        price: Number(productFormData.price),
        importPrice: Number(productFormData.importPrice) || 0,
        unit: unitSymbol, // Save symbol or name for backward compatibility
        category: productFormData.category,
        stock: Number(productFormData.stock),
        supplier: productFormData.supplier,
        image: productFormData.image,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }

      setIsProductDialogOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      await alert({
        title: 'Lỗi',
        message: 'Không thể lưu sản phẩm. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const handleImportStock = async () => {
    if (!importingProduct) return;
    
    const quantity = Number(importQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      await alert({
        title: 'Lỗi',
        message: 'Vui lòng nhập số lượng hợp lệ!',
        variant: 'warning',
      });
      return;
    }

    try {
      await updateProduct(importingProduct.id, {
        stock: importingProduct.stock + quantity,
      });
      await alert({
        title: 'Thành công',
        message: `Đã nhập ${quantity} ${importingProduct.unit} vào kho!`,
        variant: 'success',
      });
      setIsImportDialogOpen(false);
      setImportingProduct(null);
      setImportQuantity('');
    } catch (error) {
      console.error('Error importing stock:', error);
      await alert({
        title: 'Lỗi',
        message: 'Không thể nhập hàng. Vui lòng thử lại!',
        variant: 'error',
      });
    }
  };

  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteProduct = (id: string) => {
    setDeleteProductId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (deleteProductId) {
      try {
        await deleteProduct(deleteProductId);
        setDeleteProductId(null);
      } catch (error: any) {
        await alert({
          title: 'Lỗi',
          message: 'Không thể xóa sản phẩm. Vui lòng thử lại.',
          variant: 'danger',
        });
      }
    }
  };


  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const loading = productsLoading;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-gray-900">Quản Lý Mặt Hàng</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-gray-600">Tổng sản phẩm</p>
                    <p className="text-gray-900">{products.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Package className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-gray-600">Tổng tồn kho</p>
                    <p className="text-gray-900">{totalStock}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Package className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <p className="text-gray-600">Giá trị tồn kho</p>
                    <p className="text-gray-900">{totalValue.toLocaleString('vi-VN')}₫</p>
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
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleOpenProductDialog()}>
                    <Plus className="mr-2" size={18} />
                    Thêm Sản Phẩm
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setIsSettingsDialogOpen(true)}
                    title="Quản lý cài đặt"
                  >
                    <MoreVertical size={18} />
                  </Button>
                </div>
              </div>

              {/* Filters and Sort */}
              <div className="flex gap-3 items-center flex-wrap">
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
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${category.id}`}
                              checked={selectedCategories.includes(category.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategories([...selectedCategories, category.name]);
                                } else {
                                  setSelectedCategories(selectedCategories.filter(c => c !== category.name));
                                }
                              }}
                            />
                            <Label htmlFor={`cat-${category.id}`} className="text-sm font-normal cursor-pointer">
                              {category.name}
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

                {/* Supplier Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter size={16} />
                      Nhà cung cấp
                      {selectedSuppliers.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedSuppliers.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Lọc theo nhà cung cấp</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {suppliers.map((supplier) => (
                          <div key={supplier.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`sup-${supplier.id}`}
                              checked={selectedSuppliers.includes(supplier.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSuppliers([...selectedSuppliers, supplier.name]);
                                } else {
                                  setSelectedSuppliers(selectedSuppliers.filter(s => s !== supplier.name));
                                }
                              }}
                            />
                            <Label htmlFor={`sup-${supplier.id}`} className="text-sm font-normal cursor-pointer">
                              {supplier.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {selectedSuppliers.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => setSelectedSuppliers([])}
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
                {(selectedCategories.length > 0 || selectedSuppliers.length > 0 || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategories([]);
                      setSelectedSuppliers([]);
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

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">
                  {products.length === 0 
                    ? 'Chưa có sản phẩm nào. Hãy thêm sản phẩm đầu tiên!'
                    : 'Không tìm thấy sản phẩm phù hợp với bộ lọc.'}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <Card key={product.id} className="overflow-hidden flex flex-col">
                  <div className="relative h-48 bg-gray-100">
                    <ImageWithFallback
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-gray-900 flex-1">{product.name}</h3>
                      <Badge variant="secondary" className="shrink-0">{product.category}</Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Giá nhập:</span>
                        <span className="text-gray-900">{product.importPrice.toLocaleString('vi-VN')}₫/{product.unit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Giá bán:</span>
                        <span className="text-gray-900">{product.price.toLocaleString('vi-VN')}₫/{product.unit}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Tồn kho:</span>
                        <Badge variant={product.stock < 20 ? 'destructive' : 'default'}>
                          {product.stock} {product.unit}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Nhà cung cấp:</span>
                        <span className="text-gray-900">{product.supplier}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setImportingProduct(product);
                          setImportQuantity('');
                          setIsImportDialogOpen(true);
                        }}
                      >
                        <PackagePlus size={14} className="mr-1" />
                        Nhập hàng
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleOpenProductDialog(product)}
                      >
                        <Edit size={14} className="mr-1" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            )}
        </div>
      </div>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent 
          className="!max-w-[840px] !w-[66.5vw] !h-[calc(63vh-100px)] !overflow-hidden !flex !flex-col !p-6"
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '840px',
            width: '66.5vw',
            height: 'calc(63vh - 100px)',
            overflow: 'hidden',
          }}
        >
          <DialogHeader className="flex-shrink-0 mb-4">
            <DialogTitle>
              {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex gap-6 overflow-hidden min-h-0" style={{ display: 'flex', minHeight: 0, alignItems: 'flex-start' }}>
            {/* Image Section - Left */}
            <div className="flex-shrink-0 flex flex-col" style={{ width: '320px', flexShrink: 0 }}>
              <Label className="mb-2 block">Ảnh sản phẩm</Label>
              <ImageCropper
                image={productFormData.image}
                onImageChange={(imageUrl) => setProductFormData({ ...productFormData, image: imageUrl })}
                width={300}
                height={300}
              />
            </div>

            {/* Form Section - Right */}
            <div className="flex-1 space-y-4 min-w-0 overflow-y-auto" style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: '8px' }}>
            <div>
              <Label className="mb-2 block">Tên sản phẩm</Label>
              <Input
                value={productFormData.name}
                onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                placeholder="Nhập tên sản phẩm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Giá nhập</Label>
                <Input
                  type="number"
                  value={productFormData.importPrice}
                  onChange={(e) => setProductFormData({ ...productFormData, importPrice: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-2 block">Giá bán</Label>
                <Input
                  type="number"
                  value={productFormData.price}
                  onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            {(() => {
              const importPrice = Number(productFormData.importPrice) || 0;
              const price = Number(productFormData.price) || 0;
              const margin = price - importPrice;
              const marginPercent = importPrice > 0 ? ((margin / importPrice) * 100).toFixed(2) : 0;
              return (
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div>
                    <Label className="text-sm text-gray-600">Lợi nhuận</Label>
                    <p className="text-lg font-semibold text-gray-900">
                      {margin.toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Tỷ lệ lợi nhuận</Label>
                    <p className="text-lg font-semibold text-gray-900">
                      {marginPercent}%
                    </p>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Đơn vị</Label>
                {units.length > 0 ? (
                  <Select 
                    value={productFormData.unit} 
                    onValueChange={(value) => {
                      setProductFormData({ ...productFormData, unit: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đơn vị" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.symbol ? `${unit.name} (${unit.symbol})` : unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 flex items-center text-gray-500">
                    Chưa có đơn vị. Vui lòng thêm đơn vị trước.
                  </div>
                )}
              </div>
              <div>
                <Label className="mb-2 block">Tồn kho</Label>
                <Input
                  type="number"
                  value={productFormData.stock}
                  onChange={(e) => setProductFormData({ ...productFormData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Danh mục</Label>
              <Select value={productFormData.category} onValueChange={(value) => setProductFormData({ ...productFormData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Nhà cung cấp</Label>
              <Select value={productFormData.supplier} onValueChange={(value) => setProductFormData({ ...productFormData, supplier: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.name}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveProduct}>
              {editingProduct ? 'Cập Nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xóa sản phẩm"
        message="Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={confirmDeleteProduct}
      />

      {/* Settings Dialog */}
      <ProductSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      />

      {/* Import Stock Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nhập Hàng</DialogTitle>
          </DialogHeader>
          {importingProduct && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Sản phẩm</Label>
                <p className="text-gray-900 font-medium">{importingProduct.name}</p>
              </div>
              <div>
                <Label>Tồn kho hiện tại</Label>
                <p className="text-gray-600">{importingProduct.stock} {importingProduct.unit}</p>
              </div>
              <div>
                <Label htmlFor="importQuantity">Số lượng nhập thêm *</Label>
                <Input
                  id="importQuantity"
                  type="number"
                  min="1"
                  value={importQuantity}
                  onChange={(e) => setImportQuantity(e.target.value)}
                  placeholder="Nhập số lượng"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Đơn vị: {importingProduct.unit}</p>
              </div>
              {importQuantity && !isNaN(Number(importQuantity)) && Number(importQuantity) > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Tồn kho sau khi nhập: <span className="font-semibold text-blue-900">
                      {importingProduct.stock + Number(importQuantity)} {importingProduct.unit}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImportDialogOpen(false);
              setImportingProduct(null);
              setImportQuantity('');
            }}>
              Hủy
            </Button>
            <Button onClick={handleImportStock} disabled={!importQuantity || Number(importQuantity) <= 0}>
              Xác nhận nhập hàng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Component */}
      <AlertComponent />
    </div>
  );
}
