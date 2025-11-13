import { useRef } from 'react';
import { Button } from './ui/button';
import { Printer, Download } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { useShopInfo } from '../contexts/ShopInfoContext';

interface InvoiceItem {
  productName: string;
  quantity: number;
  price: number;
}

interface InvoiceReceiptProps {
  invoice: {
    id: string;
    invoiceCode?: string; // Mã hóa đơn (HD000001, HD000002, ...)
    date: string;
    time: string;
    items: InvoiceItem[];
    subtotal: number;
    discount: number;
    promotionDiscount?: number; // Giảm giá từ khuyến mãi
    voucherDiscount?: number; // Giảm giá từ voucher
    total: number;
    paymentMethod: 'cash' | 'card' | 'transfer';
    customerName?: string;
    voucherCode?: string;
  };
  shopInfo?: {
    name: string;
    address: string;
    phone: string;
    taxCode?: string;
  };
  isOpen?: boolean;
  onClose?: () => void;
}

const defaultShopInfo = {
  name: 'Fruit Shop',
  address: '123 Đường ABC, Quận 1, TP.HCM',
  phone: '0901 234 567',
  taxCode: '0123456789',
};

export function InvoiceReceipt({ invoice, shopInfo: propShopInfo, isOpen, onClose }: InvoiceReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { shopInfo: contextShopInfo } = useShopInfo();
  
  // Use context shop info if available, otherwise use prop, otherwise use default
  const shopInfo = propShopInfo || contextShopInfo || defaultShopInfo;

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const printStyles = `
          <style>
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
            }
                body {
                  font-family: 'Arial', sans-serif;
                  margin: 0;
                  padding: 20px;
                  color: #000;
                }
                .invoice-container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                }
                .header {
                  text-align: center;
                  border-bottom: 2px solid #000;
                  padding-bottom: 20px;
                  margin-bottom: 20px;
                }
                .header h1 {
                  margin: 0 0 10px 0;
                  font-size: 28px;
                  font-weight: bold;
                }
                .header p {
                  margin: 5px 0;
                  font-size: 14px;
                }
                .invoice-info {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 20px;
                }
                .info-section {
                  flex: 1;
                }
                .info-section h3 {
                  margin: 0 0 10px 0;
                  font-size: 16px;
                  border-bottom: 1px solid #ddd;
                  padding-bottom: 5px;
                }
                .info-section p {
                  margin: 5px 0;
                  font-size: 14px;
                }
                .items-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
                }
                .items-table th {
                  background: #f5f5f5;
                  padding: 10px;
                  text-align: left;
                  border-bottom: 2px solid #000;
                  font-weight: bold;
                }
                .items-table td {
                  padding: 10px;
                  border-bottom: 1px solid #ddd;
                }
                .items-table tr:last-child td {
                  border-bottom: 2px solid #000;
                }
                .text-right {
                  text-align: right;
                }
                .summary {
                  margin-top: 20px;
                }
                .summary-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 8px 0;
                  font-size: 14px;
                }
                .summary-row.total {
                  font-size: 18px;
                  font-weight: bold;
                  border-top: 2px solid #000;
                  padding-top: 10px;
                  margin-top: 10px;
                }
                .footer {
                  margin-top: 40px;
                  text-align: center;
                  font-size: 12px;
                  color: #666;
                  border-top: 1px solid #ddd;
                  padding-top: 20px;
                }
              </style>
        `;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Hóa đơn ${invoice.invoiceCode || invoice.id}</title>
              ${printStyles}
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Tiền mặt',
      card: 'Thẻ',
      transfer: 'Chuyển khoản',
    };
    return labels[method] || method;
  };

  const receiptContent = (
    <div ref={printRef} className="invoice-container bg-white p-6 md:p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="header text-center border-b-2 border-black pb-5 mb-5">
        <h1 className="text-3xl font-bold mb-2">{shopInfo.name}</h1>
        <p className="text-sm">{shopInfo.address}</p>
        <p className="text-sm">Điện thoại: {shopInfo.phone}</p>
        {shopInfo.taxCode && <p className="text-sm">Mã số thuế: {shopInfo.taxCode}</p>}
      </div>

      {/* Invoice Info */}
      <div className="invoice-info flex justify-between mb-5">
        <div className="info-section">
          <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-2">THÔNG TIN HÓA ĐƠN</h3>
          <p><strong>Mã hóa đơn:</strong> {invoice.invoiceCode || invoice.id}</p>
          <p><strong>Ngày:</strong> {new Date(invoice.date).toLocaleDateString('vi-VN')}</p>
          <p><strong>Giờ:</strong> {invoice.time}</p>
          <p><strong>Khách hàng:</strong> {invoice.customerName || 'Khách lẻ'}</p>
        </div>
        <div className="info-section">
          <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-2">THANH TOÁN</h3>
          <p><strong>Phương thức:</strong> {getPaymentMethodLabel(invoice.paymentMethod)}</p>
          {invoice.voucherCode && (
            <p><strong>Mã voucher:</strong> {invoice.voucherCode}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="items-table w-full border-collapse mb-5">
        <thead>
          <tr>
            <th className="bg-gray-100 p-3 text-left border-b-2 border-black font-bold">STT</th>
            <th className="bg-gray-100 p-3 text-left border-b-2 border-black font-bold">Tên sản phẩm</th>
            <th className="bg-gray-100 p-3 text-right border-b-2 border-black font-bold">Đơn giá</th>
            <th className="bg-gray-100 p-3 text-right border-b-2 border-black font-bold">Số lượng</th>
            <th className="bg-gray-100 p-3 text-right border-b-2 border-black font-bold">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index}>
              <td className="p-3 border-b border-gray-200">{index + 1}</td>
              <td className="p-3 border-b border-gray-200">{item.productName}</td>
              <td className="p-3 border-b border-gray-200 text-right">{item.price.toLocaleString('vi-VN')}₫</td>
              <td className="p-3 border-b border-gray-200 text-right">{item.quantity}</td>
              <td className="p-3 border-b border-gray-200 text-right font-semibold">
                {(item.price * item.quantity).toLocaleString('vi-VN')}₫
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="summary mt-5">
        <div className="summary-row flex justify-between py-2 text-sm">
          <span>Tạm tính:</span>
          <span>{invoice.subtotal.toLocaleString('vi-VN')}₫</span>
        </div>
        {(invoice.promotionDiscount && invoice.promotionDiscount > 0) && (
          <div className="summary-row flex justify-between py-2 text-sm text-green-600">
            <span>Giảm khuyến mãi:</span>
            <span>-{invoice.promotionDiscount.toLocaleString('vi-VN')}₫</span>
          </div>
        )}
        {(invoice.voucherDiscount && invoice.voucherDiscount > 0) && (
          <div className="summary-row flex justify-between py-2 text-sm text-green-600">
            <span>Giảm mã giảm giá:</span>
            <span>-{invoice.voucherDiscount.toLocaleString('vi-VN')}₫</span>
          </div>
        )}
        {invoice.discount > 0 && (!invoice.promotionDiscount || invoice.promotionDiscount === 0) && (!invoice.voucherDiscount || invoice.voucherDiscount === 0) && (
          <div className={`summary-row flex justify-between py-2 text-sm ${invoice.discount > 0 ? 'text-green-600' : ''}`}>
            <span>Giảm giá:</span>
            <span>{invoice.discount > 0 ? `-${invoice.discount.toLocaleString('vi-VN')}₫` : '0₫'}</span>
          </div>
        )}
        <div className="summary-row total flex justify-between pt-3 mt-3 border-t-2 border-black text-lg font-bold">
          <div>
            <div>TỔNG CỘNG:</div>
            {invoice.customerName && (
              <div className="text-sm font-normal text-gray-600 mt-1">
                Khách hàng: <span className="font-semibold">{invoice.customerName}</span>
              </div>
            )}
          </div>
          <span>{invoice.total.toLocaleString('vi-VN')}₫</span>
        </div>
      </div>

      {/* Footer */}
      <div className="footer mt-10 text-center text-xs text-gray-500 border-t border-gray-300 pt-5">
        <p>Cảm ơn quý khách đã mua sắm!</p>
        <p className="mt-2">Hóa đơn điện tử có giá trị pháp lý</p>
      </div>
    </div>
  );

  if (isOpen !== undefined && onClose) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto p-0 [&>button]:hidden">
          <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center no-print">
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer size={16} />
                In hóa đơn
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
                <Download size={16} />
                Tải PDF
              </Button>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="gap-2">
              Đóng
            </Button>
          </div>
          <div className="p-6 md:p-8">
            {receiptContent}
          </div>
          <style>{`
            @media print {
              .no-print {
                display: none !important;
              }
            }
          `}</style>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="bg-white p-8">
      <div className="flex justify-end gap-2 mb-4 no-print">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer size={16} />
          In hóa đơn
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
          <Download size={16} />
          Tải PDF
        </Button>
      </div>
      {receiptContent}
    </div>
  );
}

