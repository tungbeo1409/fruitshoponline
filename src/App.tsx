import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ShopInfoProvider } from './contexts/ShopInfoContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { POS } from './components/POS';
import { ProductManagement } from './components/ProductManagement';
import { PromotionManagement } from './components/PromotionManagement';
import { VoucherManagement } from './components/VoucherManagement';
import { InvoiceManagement } from './components/InvoiceManagement';
import { Statistics } from './components/Statistics';
import { ShopInfoManagement } from './components/ShopInfoManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { ShoppingCart, Package, Tag, Ticket, FileText, BarChart3, Menu, X, LogOut, User, Store, Users } from 'lucide-react';
import { Logo } from './components/Logo';
import { Button } from './components/ui/button';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './contexts/AuthContext';
import { useShopInfo } from './contexts/ShopInfoContext';

type Page = 'pos' | 'products' | 'promotions' | 'vouchers' | 'invoices' | 'statistics' | 'shopInfo' | 'customers';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('pos');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentUser, logout } = useAuth();
  const { shopInfo } = useShopInfo();

  const menuItems = [
    { id: 'pos' as Page, label: 'Bán Hàng', icon: ShoppingCart },
    { id: 'products' as Page, label: 'Mặt Hàng', icon: Package },
    { id: 'promotions' as Page, label: 'Khuyến Mãi', icon: Tag },
    { id: 'vouchers' as Page, label: 'Voucher', icon: Ticket },
    { id: 'invoices' as Page, label: 'Hóa Đơn', icon: FileText },
    { id: 'customers' as Page, label: 'Khách Hàng', icon: Users },
    { id: 'statistics' as Page, label: 'Thống Kê', icon: BarChart3 },
    { id: 'shopInfo' as Page, label: 'Thông Tin Cửa Hàng', icon: Store },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'pos':
        return <POS />;
      case 'products':
        return <ProductManagement />;
      case 'promotions':
        return <PromotionManagement />;
      case 'vouchers':
        return <VoucherManagement />;
      case 'invoices':
        return <InvoiceManagement />;
      case 'statistics':
        return <Statistics />;
      case 'shopInfo':
        return <ShopInfoManagement />;
      case 'customers':
        return <CustomerManagement />;
      default:
        return <POS />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-white border-r transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <Logo className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-gray-900">Fruit POS</h2>
              <p className="text-sm text-gray-500">Hệ thống bán hoa quả</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-4 text-white">
            <p className="mb-1 font-semibold text-base">{shopInfo?.name || 'Fruit Shop'}</p>
            <p className="text-xs opacity-90 mt-1">{shopInfo?.address || '123 Đường ABC, Q.1, TP.HCM'}</p>
            <div className="mt-2 space-y-1">
              <p className="text-xs opacity-90">
                <span className="font-medium">Hotline:</span> {shopInfo?.phone || '0901 234 567'}
              </p>
              {shopInfo?.email && (
                <p className="text-xs opacity-90">
                  <span className="font-medium">Email:</span> {shopInfo.email}
                </p>
              )}
              {shopInfo?.taxCode && (
                <p className="text-xs opacity-90">
                  <span className="font-medium">MST:</span> {shopInfo.taxCode}
                </p>
              )}
            </div>
          </div>
          
          {currentUser && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User size={16} className="text-gray-600" />
                <span className="text-gray-700 font-medium">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={logout}
              >
                <LogOut size={16} className="mr-2" />
                Đăng xuất
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
          <div className="flex items-center gap-2">
            <Logo className="text-gray-900" size={24} />
            <h1 className="text-gray-900">Fruit POS</h1>
          </div>
          <div className="w-10" />
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {renderPage()}
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ShopInfoProvider>
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        </ShopInfoProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
