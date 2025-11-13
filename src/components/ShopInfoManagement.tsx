import { useState, useEffect } from 'react';
import { useShopInfo, BankAccount } from '../contexts/ShopInfoContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Store, MapPin, Phone, Mail, FileText, Loader2, Save, Plus, Trash2, Edit, X, Check, Building2, Eye, Star } from 'lucide-react';

export function ShopInfoManagement() {
  const { shopInfo, loading, updateShopInfo } = useShopInfo();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    taxCode: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState<Partial<BankAccount>>({
    bankName: '',
    accountNumber: '',
    accountHolder: 'Thích Phượng Shop',
  });
  const [viewingQR, setViewingQR] = useState<BankAccount | null>(null);
  
  // Bank list from sepay.vn API
  interface BankInfo {
    name: string;
    code: string;
    bin: string;
    short_name: string;
    supported: boolean;
  }
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Load bank list from sepay.vn API
  useEffect(() => {
    const fetchBanks = async () => {
      setLoadingBanks(true);
      try {
        const response = await fetch('https://qr.sepay.vn/banks.json');
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          // Filter only supported banks
          const supportedBanks = data.data.filter((bank: BankInfo) => bank.supported);
          setBanks(supportedBanks);
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
      } finally {
        setLoadingBanks(false);
      }
    };
    fetchBanks();
  }, []);

  useEffect(() => {
    if (shopInfo) {
      console.log('ShopInfo loaded:', shopInfo);
      setFormData({
        name: shopInfo.name || '',
        address: shopInfo.address || '',
        phone: shopInfo.phone || '',
        email: shopInfo.email || '',
        taxCode: shopInfo.taxCode || '',
        description: shopInfo.description || '',
      });
      // Load bank accounts from shopInfo
      console.log('shopInfo.bankAccounts:', shopInfo.bankAccounts);
      console.log('Type of bankAccounts:', typeof shopInfo.bankAccounts);
      console.log('Is array?', Array.isArray(shopInfo.bankAccounts));
      if (shopInfo.bankAccounts && Array.isArray(shopInfo.bankAccounts)) {
        console.log('Loading bank accounts:', shopInfo.bankAccounts);
        // Không cập nhật nếu đang trong quá trình cập nhật default (tránh ghi đè optimistic update)
        if (isUpdatingDefault) {
          console.log('Skipping bank accounts update - updating default in progress');
          return;
        }
        // Ensure bankCode is set for all accounts (backfill if missing)
        // Only backfill if banks list is loaded
        const accountsWithBankCode = shopInfo.bankAccounts.map((account: BankAccount) => {
          if (!account.bankCode && account.bankName && banks.length > 0) {
            const bank = banks.find(b => b.name === account.bankName);
            if (bank) {
              console.log('Backfilling bankCode for:', account.bankName, '->', bank.short_name);
              return { ...account, bankCode: bank.short_name };
            } else {
              console.warn('Could not find bank for:', account.bankName);
            }
          }
          return account;
        });
        setBankAccounts(accountsWithBankCode);
      } else {
        console.log('No bank accounts found, setting empty array. shopInfo.bankAccounts:', shopInfo.bankAccounts);
        setBankAccounts([]);
      }
    } else {
      // Reset when shopInfo is null
      console.log('ShopInfo is null, resetting bankAccounts');
      setBankAccounts([]);
    }
  }, [shopInfo, banks, isUpdatingDefault]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      console.log('Saving bank accounts:', bankAccounts);
      await updateShopInfo({
        ...formData,
        bankAccounts: bankAccounts,
      });
    } catch (error) {
      // Error is handled in context
      console.error('Error saving shop info:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBankAccount = () => {
    if (!newBankAccount.bankName || !newBankAccount.accountNumber || !newBankAccount.accountHolder) {
      console.log('Cannot add bank account - missing fields:', newBankAccount);
      return;
    }
    // Find bank code from banks list (exact match)
    const selectedBank = banks.find(b => b.name === newBankAccount.bankName);
    if (!selectedBank) {
      console.error('Bank not found in list:', newBankAccount.bankName);
      console.log('Available banks:', banks.map(b => b.name));
    }
    const newAccount: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: newBankAccount.bankName,
      bankCode: selectedBank?.short_name || '',
      accountNumber: newBankAccount.accountNumber,
      accountHolder: newBankAccount.accountHolder,
    };
    console.log('Adding bank account:', newAccount, 'selectedBank:', selectedBank);
    console.log('Current bankAccounts before add:', bankAccounts);
    const updatedAccounts = [...bankAccounts, newAccount];
    console.log('Updated bankAccounts after add:', updatedAccounts);
    setBankAccounts(updatedAccounts);
    setNewBankAccount({
      bankName: '',
      accountNumber: '',
      accountHolder: 'Thích Phượng Shop',
    });
  };

  const handleEditBankAccount = (id: string) => {
    const account = bankAccounts.find(b => b.id === id);
    if (account) {
      setNewBankAccount(account);
      setEditingBankId(id);
    }
  };

  const handleUpdateBankAccount = () => {
    if (!editingBankId || !newBankAccount.bankName || !newBankAccount.accountNumber || !newBankAccount.accountHolder) {
      return;
    }
    // Find bank code from banks list (exact match)
    const selectedBank = banks.find(b => b.name === newBankAccount.bankName);
    if (!selectedBank) {
      console.error('Bank not found in list:', newBankAccount.bankName);
      console.log('Available banks:', banks.map(b => b.name));
    }
    const updatedAccount: BankAccount = {
      id: editingBankId,
      bankName: newBankAccount.bankName,
      bankCode: selectedBank?.short_name || '',
      accountNumber: newBankAccount.accountNumber,
      accountHolder: newBankAccount.accountHolder,
      isDefault: newBankAccount.isDefault,
    };
    console.log('Updating bank account:', updatedAccount, 'selectedBank:', selectedBank);
    setBankAccounts(bankAccounts.map(b => 
      b.id === editingBankId ? updatedAccount : b
    ));
    setEditingBankId(null);
    setNewBankAccount({
      bankName: '',
      accountNumber: '',
      accountHolder: 'Thích Phượng Shop',
    });
  };

  const handleDeleteBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter(b => b.id !== id));
  };

  const handleSetDefaultBank = async (id: string) => {
    // Set only this bank as default, unset others
    const updatedAccounts = bankAccounts.map(b => ({
      ...b,
      isDefault: b.id === id
    }));
    
    setIsUpdatingDefault(true);
    // Optimistic update - cập nhật UI ngay
    setBankAccounts(updatedAccounts);
    
    // Lưu ngay vào Firestore
    try {
      await updateShopInfo({
        ...formData,
        bankAccounts: updatedAccounts,
        invoiceCounter: shopInfo?.invoiceCounter,
      });
    } catch (error) {
      console.error('Error updating default bank account:', error);
      // Revert state if save failed
      setBankAccounts(bankAccounts);
    } finally {
      setIsUpdatingDefault(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingBankId(null);
    setNewBankAccount({
      bankName: '',
      accountNumber: '',
      accountHolder: 'Thích Phượng Shop',
    });
  };

  // Get bank icon URL
  const getBankIconUrl = (bankName: string): string => {
    const bank = banks.find(b => b.name === bankName);
    if (bank && bank.short_name) {
      // Use vietqr.io for bank icons
      return `https://img.vietqr.io/${bank.short_name}/compact.png`;
    }
    return '';
  };

  const getQRCodeUrl = (account: BankAccount): string => {
    // Use bankCode if available, otherwise try to find from banks list
    let bankCode = account.bankCode;
    if (!bankCode) {
      const bank = banks.find(b => b.name === account.bankName);
      bankCode = bank?.short_name || account.bankName.toUpperCase().replace(/\s+/g, '');
      console.warn('Bank code not found for:', account.bankName, 'using:', bankCode);
    }
    // URL parameters: acc (số tài khoản), bank (code ngân hàng), amount (số tiền), des (nội dung)
    // Không encode số tài khoản và bank code, chỉ encode description
    const accountNumber = account.accountNumber.trim();
    const description = (account.accountHolder || '').trim();
    const url = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=0&des=${encodeURIComponent(description)}`;
    console.log('QR Code URL (view):', url, { account, bankCode });
    return url;
  };

  const handleViewQR = (account: BankAccount) => {
    setViewingQR(account);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải thông tin cửa hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-gray-900">Quản Lý Thông Tin Cửa Hàng</h1>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                <Store className="text-white" size={24} />
              </div>
              <div>
                <CardTitle>Thông Tin Cửa Hàng</CardTitle>
                <CardDescription>
                  Cập nhật thông tin cửa hàng của bạn. Thông tin này sẽ được hiển thị trên hóa đơn.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tên cửa hàng */}
                <div className="space-y-2">
                  <Label htmlFor="name">Tên cửa hàng *</Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      placeholder="Nhập tên cửa hàng"
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Số điện thoại */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                      placeholder="0901 234 567"
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Địa chỉ */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Địa chỉ *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="pl-10"
                      placeholder="123 Đường ABC, Q.1, TP.HCM"
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      placeholder="shop@example.com"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Mã số thuế */}
                <div className="space-y-2">
                  <Label htmlFor="taxCode">Mã số thuế</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      id="taxCode"
                      value={formData.taxCode}
                      onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                      className="pl-10"
                      placeholder="0123456789"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Mô tả */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Mô tả cửa hàng</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Nhập mô tả về cửa hàng của bạn..."
                    rows={4}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Thông tin ngân hàng */}
              <div className="md:col-span-2 space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-gray-600" size={20} />
                    <Label className="text-lg font-semibold">Thông tin ngân hàng</Label>
                  </div>
                </div>

                {/* Danh sách tài khoản ngân hàng */}
                {bankAccounts.length > 0 && (
                  <div className="space-y-3">
                    {bankAccounts.map((account) => (
                      <Card key={account.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs text-gray-500">Tên ngân hàng</Label>
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
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Số tài khoản</Label>
                              <p className="font-medium font-mono">{account.accountNumber}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Chủ tài khoản</Label>
                              <p className="font-medium">{account.accountHolder}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultBank(account.id)}
                              disabled={saving || editingBankId !== null}
                              title={account.isDefault ? "QR mặc định" : "Đặt làm QR mặc định"}
                              className={account.isDefault 
                                ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500" 
                                : "hover:bg-yellow-50 hover:border-yellow-300"
                              }
                            >
                              <Star 
                                size={14} 
                                fill={account.isDefault ? "currentColor" : "none"} 
                                stroke={account.isDefault ? "currentColor" : "currentColor"}
                                className={account.isDefault ? "text-white" : "text-gray-600"}
                              />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewQR(account)}
                              disabled={saving || editingBankId !== null}
                              title="Xem QR code"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBankAccount(account.id)}
                              disabled={saving || editingBankId !== null}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBankAccount(account.id)}
                              disabled={saving || editingBankId !== null}
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Form thêm/sửa tài khoản ngân hàng */}
                <Card className="p-4 bg-gray-50">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="text-gray-600" size={18} />
                      <Label className="font-semibold">
                        {editingBankId ? 'Sửa thông tin ngân hàng' : 'Thêm tài khoản ngân hàng'}
                      </Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Tên ngân hàng *</Label>
                        {loadingBanks ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Đang tải danh sách ngân hàng...</span>
                          </div>
                        ) : (
                          <Select
                            value={newBankAccount.bankName || ''}
                            onValueChange={(value: string) => setNewBankAccount({ ...newBankAccount, bankName: value })}
                            disabled={saving}
                          >
                            <SelectTrigger id="bankName">
                              <SelectValue placeholder="Chọn ngân hàng" />
                            </SelectTrigger>
                            <SelectContent>
                              {banks.map((bank) => {
                                const bankIconUrl = `https://img.vietqr.io/${bank.short_name}/compact.png`;
                                return (
                                  <SelectItem key={bank.code} value={bank.name}>
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={bankIconUrl} 
                                        alt={bank.name}
                                        className="w-5 h-5 object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                      <span>{bank.name}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Số tài khoản *</Label>
                        <Input
                          id="accountNumber"
                          value={newBankAccount.accountNumber || ''}
                          onChange={(e) => setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })}
                          placeholder="VD: 1234567890"
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountHolder">Chủ tài khoản *</Label>
                        <Input
                          id="accountHolder"
                          value={newBankAccount.accountHolder || ''}
                          onChange={(e) => setNewBankAccount({ ...newBankAccount, accountHolder: e.target.value })}
                          placeholder="VD: NGUYEN VAN A"
                          disabled={saving}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {editingBankId ? (
                        <>
                          <Button
                            type="button"
                            onClick={handleUpdateBankAccount}
                            disabled={saving || !newBankAccount.bankName || !newBankAccount.accountNumber || !newBankAccount.accountHolder}
                            size="sm"
                          >
                            <Check size={14} className="mr-2" />
                            Cập nhật
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={saving}
                            size="sm"
                          >
                            <X size={14} className="mr-2" />
                            Hủy
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleAddBankAccount}
                          disabled={saving || !newBankAccount.bankName || !newBankAccount.accountNumber || !newBankAccount.accountHolder}
                          size="sm"
                          variant="outline"
                        >
                          <Plus size={14} className="mr-2" />
                          Thêm ngân hàng
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={saving}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu thông tin
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!viewingQR} onOpenChange={(open: boolean) => !open && setViewingQR(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mã QR Thanh Toán</DialogTitle>
          </DialogHeader>
          {viewingQR && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                  <img
                    src={getQRCodeUrl(viewingQR)}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngân hàng:</span>
                  <span className="font-medium">{viewingQR.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số tài khoản:</span>
                  <span className="font-medium font-mono">{viewingQR.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chủ tài khoản:</span>
                  <span className="font-medium">{viewingQR.accountHolder}</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    Quét mã QR để chuyển khoản (Số tiền: 0₫)
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

