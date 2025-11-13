import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users, Filter, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { useInvoices } from '../hooks/useInvoices';
import { useProducts } from '../hooks/useProducts';
import { useCustomers } from '../hooks/useCustomers';
import { usePromotions } from '../hooks/usePromotions';
import { useVouchers } from '../hooks/useVouchers';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

export function Statistics() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Firestore hooks
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { products, loading: productsLoading } = useProducts();
  const { customers, loading: customersLoading } = useCustomers();
  const { promotions } = usePromotions();
  const { vouchers } = useVouchers();

  // Helper function to get date range based on period
  const getDateRange = (period: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(today);
        previousStartDate = new Date(today);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(today);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }

    return { startDate, previousStartDate, previousEndDate, endDate: now };
  };

  // Filter invoices by period
  const filteredInvoices = useMemo(() => {
    const { startDate, endDate } = getDateRange(period);
    return invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= startDate && invDate <= endDate;
    });
  }, [invoices, period]);

  const previousInvoices = useMemo(() => {
    const { previousStartDate, previousEndDate } = getDateRange(period);
    return invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= previousStartDate && invDate <= previousEndDate;
    });
  }, [invoices, period]);

  // Calculate metrics
  const currentRevenue = useMemo(() => 
    filteredInvoices.reduce((sum, inv) => sum + inv.total, 0),
    [filteredInvoices]
  );

  const previousRevenue = useMemo(() => 
    previousInvoices.reduce((sum, inv) => sum + inv.total, 0),
    [previousInvoices]
  );

  const revenueGrowth = previousRevenue > 0 
    ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
    : '0';

  const currentOrders = filteredInvoices.length;
  const previousOrders = previousInvoices.length;
  const ordersGrowth = previousOrders > 0
    ? ((currentOrders - previousOrders) / previousOrders * 100).toFixed(1)
    : '0';

  const totalDiscount = useMemo(() => 
    filteredInvoices.reduce((sum, inv) => sum + inv.discount, 0),
    [filteredInvoices]
  );

  const averageOrder = currentOrders > 0 ? currentRevenue / currentOrders : 0;

  // Products stats
  const totalProducts = products.length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;

  // Customers stats
  const totalCustomers = customers.length;
  const { startDate } = getDateRange(period);
  const newCustomers = customers.filter(c => {
    if (!c.createdAt) return false;
    const createdDate = new Date(c.createdAt);
    return createdDate >= startDate;
  }).length;

  // Revenue by date chart data
  const revenueData = useMemo(() => {
    const { startDate, endDate } = getDateRange(period);
    const dateMap = new Map<string, { revenue: number; cost: number; profit: number; orders: number; displayDate?: string }>();
    
    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const displayDate = currentDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      dateMap.set(dateStr, { revenue: 0, cost: 0, profit: 0, orders: 0, displayDate });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate invoice data
    filteredInvoices.forEach(inv => {
      const dateStr = inv.date;
      const existing = dateMap.get(dateStr) || { revenue: 0, cost: 0, profit: 0, orders: 0 };
      const displayDate = existing.displayDate || new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      
      // Calculate cost for this invoice
      let invoiceCost = 0;
      inv.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        // Chỉ tính cost nếu có importPrice và importPrice > 0
        if (product && product.importPrice && product.importPrice > 0) {
          invoiceCost += product.importPrice * item.quantity;
        }
      });
      
      dateMap.set(dateStr, {
        revenue: existing.revenue + inv.total,
        cost: existing.cost + invoiceCost,
        profit: existing.profit + (inv.total - invoiceCost),
        orders: existing.orders + 1,
        displayDate
      });
    });

    return Array.from(dateMap.values())
      .map(item => ({
        date: item.displayDate || '',
        revenue: item.revenue,
        cost: item.cost,
        profit: item.profit,
        orders: item.orders
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredInvoices, products, period]);

  // Orders by time chart data
  const timeRangeData = useMemo(() => {
    const timeMap = new Map<string, number>();
    
    // Initialize hours 8-18
    for (let i = 8; i <= 18; i++) {
      timeMap.set(`${i}:00`, 0);
    }

    // Aggregate by hour
    filteredInvoices.forEach(inv => {
      if (inv.time) {
        const hour = parseInt(inv.time.split(':')[0]);
        if (hour >= 8 && hour <= 18) {
          const timeKey = `${hour}:00`;
          timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + 1);
        }
      }
    });

    return Array.from(timeMap.entries())
      .map(([time, orders]) => ({ time, orders }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredInvoices]);

  // Top products chart data
  const productData = useMemo(() => {
    const productMap = new Map<string, { name: string; sold: number; revenue: number }>();

    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const existing = productMap.get(item.productId) || { 
          name: item.productName, 
          sold: 0, 
          revenue: 0 
        };
        productMap.set(item.productId, {
          name: item.productName,
          sold: existing.sold + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity)
        });
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);
  }, [filteredInvoices]);

  // Category distribution chart data
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();

    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product && product.category) {
          categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + item.quantity);
        }
      });
    });

    const categories = Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    // Filter by selected categories if any
    if (selectedCategories.length > 0) {
      return categories.filter(cat => selectedCategories.includes(cat.name));
    }

    return categories;
  }, [filteredInvoices, products, selectedCategories]);

  // Get unique categories for filter
  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach(p => {
      if (p.category) categorySet.add(p.category);
    });
    return Array.from(categorySet).sort();
  }, [products]);

  // Calculate actual cost and profit
  const currentCost = useMemo(() => {
    let totalCost = 0;
    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        // Chỉ tính cost nếu có importPrice và importPrice > 0
        if (product && product.importPrice && product.importPrice > 0) {
          totalCost += product.importPrice * item.quantity;
        }
        // Nếu không tìm thấy sản phẩm hoặc không có importPrice, không tính cost (giả định cost = 0)
      });
    });
    return totalCost;
  }, [filteredInvoices, products]);

  const previousCost = useMemo(() => {
    let totalCost = 0;
    previousInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        // Chỉ tính cost nếu có importPrice và importPrice > 0
        if (product && product.importPrice && product.importPrice > 0) {
          totalCost += product.importPrice * item.quantity;
        }
      });
    });
    return totalCost;
  }, [previousInvoices, products]);

  const currentProfit = currentRevenue - currentCost;
  const previousProfit = previousRevenue - previousCost;
  const profitGrowth = previousProfit > 0 
    ? ((currentProfit - previousProfit) / previousProfit * 100).toFixed(1)
    : previousProfit === 0 && currentProfit > 0 ? '100' : '0';

  const loading = invoicesLoading || productsLoading || customersLoading;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-gray-600">Đang tải dữ liệu thống kê...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-gray-900">Thống Kê</h1>
          <div className="flex gap-3 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter size={16} />
                  Danh mục
                  {selectedCategories.length > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                      {selectedCategories.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Lọc theo danh mục</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableCategories.length === 0 ? (
                      <p className="text-sm text-gray-500">Chưa có danh mục</p>
                    ) : (
                      availableCategories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`stat-cat-${category}`}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories([...selectedCategories, category]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== category));
                              }
                            }}
                          />
                          <Label htmlFor={`stat-cat-${category}`} className="text-sm font-normal cursor-pointer">
                            {category}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          <Select value={period} onValueChange={(value: 'today' | 'week' | 'month' | 'year') => setPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hôm nay</SelectItem>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-auto">
        {/* Key Metrics */}
        <div className="flex gap-4 overflow-x-auto">
          <Card className="p-6 flex-shrink-0 min-w-[200px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 mb-1">Doanh thu</p>
                <p className="text-gray-900 mb-2">{currentRevenue.toLocaleString('vi-VN')}₫</p>
                <div className={`flex items-center gap-1 text-sm ${parseFloat(revenueGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(revenueGrowth) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>
                    {parseFloat(revenueGrowth) >= 0 ? '+' : ''}{revenueGrowth}% so với {period === 'today' ? 'hôm qua' : period === 'week' ? 'tuần trước' : period === 'month' ? 'tháng trước' : 'năm trước'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 flex-shrink-0 min-w-[200px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 mb-1">Lợi nhuận</p>
                <p className={`mb-2 ${currentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentProfit.toLocaleString('vi-VN')}₫
                </p>
                <div className={`flex items-center gap-1 text-sm ${parseFloat(profitGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(profitGrowth) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>
                    {parseFloat(profitGrowth) >= 0 ? '+' : ''}{profitGrowth}% so với {period === 'today' ? 'hôm qua' : period === 'week' ? 'tuần trước' : period === 'month' ? 'tháng trước' : 'năm trước'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="text-emerald-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 flex-shrink-0 min-w-[200px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 mb-1">Đơn hàng</p>
                <p className="text-gray-900 mb-2">{currentOrders}</p>
                <div className={`flex items-center gap-1 text-sm ${parseFloat(ordersGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(ordersGrowth) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>
                    {parseFloat(ordersGrowth) >= 0 ? '+' : ''}{ordersGrowth}% so với {period === 'today' ? 'hôm qua' : period === 'week' ? 'tuần trước' : period === 'month' ? 'tháng trước' : 'năm trước'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="text-blue-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 flex-shrink-0 min-w-[200px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 mb-1">Tồn kho</p>
                <p className="text-gray-900 mb-2">{totalProducts} sản phẩm</p>
                <div className="flex items-center gap-1 text-sm text-orange-600">
                  <TrendingDown size={16} />
                  <span>{lowStock} sản phẩm sắp hết</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Package className="text-purple-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="p-6 flex-shrink-0 min-w-[200px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 mb-1">Khách hàng</p>
                <p className="text-gray-900 mb-2">{totalCustomers}</p>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp size={16} />
                  <span>+{newCustomers} khách mới {period === 'today' ? 'hôm nay' : period === 'week' ? 'tuần này' : period === 'month' ? 'tháng này' : 'năm nay'}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                <Users className="text-pink-600" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Doanh Thu & Lợi Nhuận Theo Ngày</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString('vi-VN')}₫`}
                  labelFormatter={(label) => `Ngày ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Doanh thu"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Lợi nhuận"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Orders by Time */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Đơn Hàng Theo Giờ</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeRangeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => `Giờ ${label}`}
                />
                <Legend />
                <Bar dataKey="orders" fill="#8b5cf6" name="Số đơn" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Sản Phẩm Bán Chạy</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'Số lượng') return value;
                    return `${value.toLocaleString('vi-VN')}₫`;
                  }}
                />
                <Legend />
                <Bar dataKey="sold" fill="#10b981" name="Số lượng" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Distribution */}
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">Phân Bố Danh Mục</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <p className="text-gray-600 mb-2">Giá trị đơn trung bình</p>
            <p className="text-gray-900">{averageOrder > 0 ? averageOrder.toLocaleString('vi-VN') : '0'}₫</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 mb-2">Tổng giảm giá</p>
            <p className="text-gray-900">{totalDiscount.toLocaleString('vi-VN')}₫</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 mb-2">Tổng chi phí</p>
            <p className="text-gray-900">{currentCost.toLocaleString('vi-VN')}₫</p>
          </Card>
          <Card className="p-6">
            <p className="text-gray-600 mb-2">Tỷ lệ lợi nhuận</p>
            <p className={`${currentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentRevenue > 0 ? ((currentProfit / currentRevenue) * 100).toFixed(1) : '0'}%
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
