/**
 * Ví dụ sử dụng ConfirmDialog
 * 
 * Có 2 cách sử dụng:
 * 1. Sử dụng component trực tiếp
 * 2. Sử dụng hook useConfirm (khuyến nghị)
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { ConfirmDialog, useConfirm } from './ConfirmDialog';

// Cách 1: Sử dụng component trực tiếp
export function ConfirmDialogExample1() {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    // Logic xóa ở đây
    console.log('Đã xóa!');
  };

  return (
    <div className="p-4 space-y-4">
      <Button onClick={() => setOpen(true)}>Xóa sản phẩm</Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Xóa sản phẩm"
        message="Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// Cách 2: Sử dụng hook useConfirm (Khuyến nghị)
export function ConfirmDialogExample2() {
  const { confirm, ConfirmComponent } = useConfirm();

  const handleDelete = async () => {
    const result = await confirm({
      title: 'Xóa sản phẩm',
      message: 'Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      variant: 'danger',
    });

    if (result) {
      // Logic xóa ở đây
      console.log('Đã xóa!');
    } else {
      console.log('Đã hủy!');
    }
  };

  const handleSave = async () => {
    const result = await confirm({
      title: 'Lưu thay đổi',
      message: 'Bạn có muốn lưu các thay đổi?',
      confirmText: 'Lưu',
      cancelText: 'Hủy',
      variant: 'info',
    });

    if (result) {
      console.log('Đã lưu!');
    }
  };

  const handleWarning = async () => {
    const result = await confirm({
      title: 'Cảnh báo',
      message: 'Hành động này có thể ảnh hưởng đến hệ thống. Bạn có chắc chắn?',
      confirmText: 'Tiếp tục',
      cancelText: 'Hủy',
      variant: 'warning',
    });

    if (result) {
      console.log('Đã tiếp tục!');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Button onClick={handleDelete} variant="destructive">
        Xóa (Danger)
      </Button>
      <Button onClick={handleSave} variant="default">
        Lưu (Info)
      </Button>
      <Button onClick={handleWarning} variant="outline">
        Cảnh báo (Warning)
      </Button>

      {/* Phải render ConfirmComponent trong component */}
      <ConfirmComponent />
    </div>
  );
}

// Cách 3: Sử dụng với các variant khác nhau
export function ConfirmDialogVariants() {
  const { confirm, ConfirmComponent } = useConfirm();

  const examples = [
    {
      label: 'Default',
      variant: 'default' as const,
      onClick: () => confirm({
        title: 'Xác nhận',
        message: 'Đây là dialog xác nhận mặc định.',
        variant: 'default',
      }),
    },
    {
      label: 'Danger',
      variant: 'danger' as const,
      onClick: () => confirm({
        title: 'Xóa',
        message: 'Bạn có chắc muốn xóa? Hành động này không thể hoàn tác.',
        variant: 'danger',
        confirmText: 'Xóa',
      }),
    },
    {
      label: 'Warning',
      variant: 'warning' as const,
      onClick: () => confirm({
        title: 'Cảnh báo',
        message: 'Hành động này có thể gây ra hậu quả không mong muốn.',
        variant: 'warning',
      }),
    },
    {
      label: 'Info',
      variant: 'info' as const,
      onClick: () => confirm({
        title: 'Thông tin',
        message: 'Đây là một thông báo thông tin.',
        variant: 'info',
      }),
    },
    {
      label: 'Success',
      variant: 'success' as const,
      onClick: () => confirm({
        title: 'Thành công',
        message: 'Thao tác đã được thực hiện thành công!',
        variant: 'success',
      }),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Các loại Confirm Dialog</h2>
      <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <Button key={example.label} onClick={example.onClick} variant="outline">
            {example.label}
          </Button>
        ))}
      </div>

      <ConfirmComponent />
    </div>
  );
}

