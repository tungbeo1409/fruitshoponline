import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Plus, Edit, Trash2, FolderTree, Truck, Ruler } from 'lucide-react';
import { useCategories, Category } from '../hooks/useCategories';
import { useSuppliers, Supplier } from '../hooks/useSuppliers';
import { useUnits, Unit } from '../hooks/useUnits';
import { useAlert } from './AlertDialog';
import { ConfirmDialog } from './ConfirmDialog';

export function ProductSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { alert, AlertComponent } = useAlert();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { units, addUnit, updateUnit, deleteUnit } = useUnits();

  // Category states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);

  // Supplier states
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState({ name: '', phone: '', email: '', address: '' });
  const [deleteSupplierId, setDeleteSupplierId] = useState<string | null>(null);
  const [isDeleteSupplierDialogOpen, setIsDeleteSupplierDialogOpen] = useState(false);

  // Unit states
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitFormData, setUnitFormData] = useState({ name: '', symbol: '' });
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [isDeleteUnitDialogOpen, setIsDeleteUnitDialogOpen] = useState(false);

  // Category handlers
  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({ name: category.name, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setCategoryFormData({ name: '', description: '' });
    }
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name) {
      await alert({
        title: 'Thông báo',
        message: 'Vui lòng nhập tên danh mục!',
        variant: 'warning',
      });
      return;
    }

    try {
      const categoryData = {
        name: categoryFormData.name,
        description: categoryFormData.description || undefined,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
      } else {
        await addCategory(categoryData);
      }

      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
    } catch (error: any) {
      await alert({
        title: 'Lỗi',
        message: 'Không thể lưu danh mục. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeleteCategoryId(id);
    setIsDeleteCategoryDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (deleteCategoryId) {
      try {
        await deleteCategory(deleteCategoryId);
        setDeleteCategoryId(null);
      } catch (error: any) {
        await alert({
          title: 'Lỗi',
          message: 'Không thể xóa danh mục. Vui lòng thử lại.',
          variant: 'danger',
        });
      }
    }
  };

  // Supplier handlers
  const handleOpenSupplierDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierFormData({
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
      });
    } else {
      setEditingSupplier(null);
      setSupplierFormData({ name: '', phone: '', email: '', address: '' });
    }
    setIsSupplierDialogOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierFormData.name) {
      await alert({
        title: 'Thông báo',
        message: 'Vui lòng nhập tên nhà cung cấp!',
        variant: 'warning',
      });
      return;
    }

    try {
      const supplierData = {
        name: supplierFormData.name,
        phone: supplierFormData.phone || undefined,
        email: supplierFormData.email || undefined,
        address: supplierFormData.address || undefined,
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, supplierData);
      } else {
        await addSupplier(supplierData);
      }

      setIsSupplierDialogOpen(false);
      setEditingSupplier(null);
    } catch (error: any) {
      await alert({
        title: 'Lỗi',
        message: 'Không thể lưu nhà cung cấp. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setDeleteSupplierId(id);
    setIsDeleteSupplierDialogOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (deleteSupplierId) {
      try {
        await deleteSupplier(deleteSupplierId);
        setDeleteSupplierId(null);
      } catch (error: any) {
        await alert({
          title: 'Lỗi',
          message: 'Không thể xóa nhà cung cấp. Vui lòng thử lại.',
          variant: 'danger',
        });
      }
    }
  };

  // Unit handlers
  const handleOpenUnitDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitFormData({ name: unit.name, symbol: unit.symbol });
    } else {
      setEditingUnit(null);
      setUnitFormData({ name: '', symbol: '' });
    }
    setIsUnitDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!unitFormData.name) {
      await alert({
        title: 'Thông báo',
        message: 'Vui lòng nhập tên đơn vị!',
        variant: 'warning',
      });
      return;
    }

    try {
      const unitData = {
        name: unitFormData.name,
        symbol: unitFormData.symbol.trim() || '', // Symbol is optional, can be empty
      };

      if (editingUnit) {
        await updateUnit(editingUnit.id, unitData);
      } else {
        await addUnit(unitData);
      }

      setIsUnitDialogOpen(false);
      setEditingUnit(null);
    } catch (error: any) {
      await alert({
        title: 'Lỗi',
        message: 'Không thể lưu đơn vị. Vui lòng thử lại.',
        variant: 'danger',
      });
    }
  };

  const handleDeleteUnit = async (id: string) => {
    setDeleteUnitId(id);
    setIsDeleteUnitDialogOpen(true);
  };

  const confirmDeleteUnit = async () => {
    if (deleteUnitId) {
      try {
        await deleteUnit(deleteUnitId);
        setDeleteUnitId(null);
      } catch (error: any) {
        await alert({
          title: 'Lỗi',
          message: 'Không thể xóa đơn vị. Vui lòng thử lại.',
          variant: 'danger',
        });
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl !h-[85vh] !overflow-hidden !flex !flex-col !grid-cols-none !p-6">
          <DialogHeader className="flex-shrink-0 mb-4">
            <DialogTitle>Quản Lý Cài Đặt</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="categories" className="w-full flex-1 flex flex-col overflow-hidden min-h-0">
            <TabsList className="!grid !w-full grid-cols-3 mb-4 h-auto p-1 flex-shrink-0 border border-gray-200 rounded-lg">
              <TabsTrigger value="categories" className="flex items-center justify-center border-r border-gray-200 last:border-r-0">
                <FolderTree className="mr-2" size={16} />
                Danh Mục
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="flex items-center justify-center border-r border-gray-200 last:border-r-0">
                <Truck className="mr-2" size={16} />
                Nhà Cung Cấp
              </TabsTrigger>
              <TabsTrigger value="units" className="flex items-center justify-center border-r border-gray-200 last:border-r-0">
                <Ruler className="mr-2" size={16} />
                Đơn Vị
              </TabsTrigger>
            </TabsList>

            {/* Categories Tab - Table */}
            <TabsContent value="categories" className="flex-1 flex flex-col overflow-hidden min-h-0 space-y-4">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="text-lg font-semibold">Danh Mục</h3>
                <Button size="sm" onClick={() => handleOpenCategoryDialog()}>
                  <Plus className="mr-2" size={16} />
                  Thêm
                </Button>
              </div>
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex-1 flex items-center justify-center">
                  <p>Chưa có danh mục nào</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="px-4 py-3 border-b border-gray-200">Tên danh mục</TableHead>
                          <TableHead className="px-4 py-3 border-b border-gray-200">Mô tả</TableHead>
                          <TableHead className="text-right px-4 py-3 border-b border-gray-200">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map(category => (
                          <TableRow key={category.id} className="border-b border-gray-100">
                            <TableCell className="font-medium px-4 py-3">{category.name}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-3">{category.description || '-'}</TableCell>
                            <TableCell className="text-right px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenCategoryDialog(category)}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Suppliers Tab - Cards */}
            <TabsContent value="suppliers" className="flex-1 flex flex-col overflow-hidden min-h-0 space-y-4">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="text-lg font-semibold">Nhà Cung Cấp</h3>
                <Button size="sm" onClick={() => handleOpenSupplierDialog()}>
                  <Plus className="mr-2" size={16} />
                  Thêm
                </Button>
              </div>
              {suppliers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex-1 flex items-center justify-center">
                  <p>Chưa có nhà cung cấp nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto min-h-0">
                  {suppliers.map(supplier => (
                    <Card key={supplier.id} className="p-4">
                      <div className="mb-3">
                        <h4 className="font-semibold text-gray-900 mb-2">{supplier.name}</h4>
                        {supplier.phone && (
                          <p className="text-sm text-gray-600 mb-1">📞 {supplier.phone}</p>
                        )}
                        {supplier.email && (
                          <p className="text-sm text-gray-600 mb-1">✉️ {supplier.email}</p>
                        )}
                        {supplier.address && (
                          <p className="text-sm text-gray-600">📍 {supplier.address}</p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleOpenSupplierDialog(supplier)}
                        >
                          <Edit size={14} className="mr-1" />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Units Tab - Table */}
            <TabsContent value="units" className="flex-1 flex flex-col overflow-hidden min-h-0 space-y-4">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="text-lg font-semibold">Đơn Vị</h3>
                <Button size="sm" onClick={() => handleOpenUnitDialog()}>
                  <Plus className="mr-2" size={16} />
                  Thêm
                </Button>
              </div>
              {units.length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex-1 flex items-center justify-center">
                  <p>Chưa có đơn vị nào</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="px-4 py-3 border-b border-gray-200">Tên đơn vị</TableHead>
                          <TableHead className="px-4 py-3 border-b border-gray-200">Ký hiệu</TableHead>
                          <TableHead className="text-right px-4 py-3 border-b border-gray-200">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {units.map(unit => (
                          <TableRow key={unit.id} className="border-b border-gray-100">
                            <TableCell className="font-medium px-4 py-3">{unit.name}</TableCell>
                            <TableCell className="px-4 py-3">{unit.symbol || '-'}</TableCell>
                            <TableCell className="text-right px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenUnitDialog(unit)}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteUnit(unit.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên danh mục</Label>
              <Input
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="Nhập tên danh mục"
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Input
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Nhập mô tả (tùy chọn)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'Cập Nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên nhà cung cấp *</Label>
              <Input
                value={supplierFormData.name}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                placeholder="Nhập tên nhà cung cấp"
              />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input
                value={supplierFormData.phone}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                placeholder="0901 234 567"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={supplierFormData.email}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Địa chỉ</Label>
              <Input
                value={supplierFormData.address}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                placeholder="Nhập địa chỉ"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveSupplier}>
              {editingSupplier ? 'Cập Nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Chỉnh Sửa Đơn Vị' : 'Thêm Đơn Vị Mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên đơn vị *</Label>
              <Input
                value={unitFormData.name}
                onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                placeholder="Ví dụ: Kilogram"
              />
            </div>
            <div>
              <Label>Ký hiệu</Label>
              <Input
                value={unitFormData.symbol}
                onChange={(e) => setUnitFormData({ ...unitFormData, symbol: e.target.value })}
                placeholder="Ví dụ: kg (tùy chọn)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveUnit}>
              {editingUnit ? 'Cập Nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        open={isDeleteCategoryDialogOpen}
        onOpenChange={setIsDeleteCategoryDialogOpen}
        title="Xóa danh mục"
        message="Bạn có chắc muốn xóa danh mục này?"
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={confirmDeleteCategory}
      />

      <ConfirmDialog
        open={isDeleteSupplierDialogOpen}
        onOpenChange={setIsDeleteSupplierDialogOpen}
        title="Xóa nhà cung cấp"
        message="Bạn có chắc muốn xóa nhà cung cấp này?"
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={confirmDeleteSupplier}
      />

      <ConfirmDialog
        open={isDeleteUnitDialogOpen}
        onOpenChange={setIsDeleteUnitDialogOpen}
        title="Xóa đơn vị"
        message="Bạn có chắc muốn xóa đơn vị này?"
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={confirmDeleteUnit}
      />

      <AlertComponent />
    </>
  );
}

