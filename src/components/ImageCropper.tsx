import { useState } from 'react';
import { Upload, X, Edit2 } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onImageChange: (imageUrl: string) => void;
  width?: number;
  height?: number;
}

export function ImageCropper({ image, onImageChange, width = 300, height = 300 }: ImageCropperProps) {
  const [preview, setPreview] = useState<string>(image);

  const handleImageClick = () => {
    // Tạo input file động
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        // Tạo image để resize và compress
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          // Tạo canvas để resize ảnh
          const canvas = document.createElement('canvas');
          const maxWidth = 800; // Giới hạn chiều rộng tối đa
          const maxHeight = 800; // Giới hạn chiều cao tối đa
          
          let canvasWidth = img.width;
          let canvasHeight = img.height;
          
          // Tính toán kích thước mới giữ nguyên tỷ lệ
          if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
            const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
            canvasWidth = canvasWidth * ratio;
            canvasHeight = canvasHeight * ratio;
          }
          
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          // Vẽ ảnh đã resize lên canvas
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            // Chuyển đổi sang base64 với chất lượng 0.85 (giảm kích thước)
            const base64Image = canvas.toDataURL('image/jpeg', 0.85);
            setPreview(base64Image);
            onImageChange(base64Image);
          }
          
          // Cleanup object URL
          URL.revokeObjectURL(objectUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
      }
    };
    input.click();
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview('');
    onImageChange('');
  };

  return (
    <div className="flex flex-col space-y-2">
      <div 
        className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 cursor-pointer hover:border-gray-400 transition-colors shadow-sm"
        style={{ width, height }}
        onClick={handleImageClick}
      >
        {preview ? (
          <div className="relative w-full h-full group">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick();
              }}
              className="absolute top-2 right-2 bg-white text-gray-700 rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors"
              title="Chọn lại"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Xóa ảnh"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <Upload size={48} />
          </div>
        )}
      </div>

      {!preview && (
        <p className="text-sm text-center text-gray-500">Chọn hình ảnh</p>
      )}
      {preview && (
        <p className="text-xs text-center text-gray-400">Click vào hình để đổi hình</p>
      )}
    </div>
  );
}

