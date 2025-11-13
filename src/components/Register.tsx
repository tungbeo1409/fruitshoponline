import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { useAlert } from './AlertDialog';
import { Logo } from './Logo';

interface RegisterProps {
  onBack?: () => void;
}

export function Register({ onBack }: RegisterProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { alert, AlertComponent } = useAlert();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      await alert({
        title: 'Lỗi',
        message: 'Mật khẩu xác nhận không khớp!',
        variant: 'warning',
      });
      return;
    }

    if (password.length < 6) {
      await alert({
        title: 'Lỗi',
        message: 'Mật khẩu phải có ít nhất 6 ký tự!',
        variant: 'warning',
      });
      return;
    }

    setLoading(true);
    
    try {
      await register(email, password, displayName);
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {onBack && (
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mb-2"
              >
                <ArrowLeft size={16} className="mr-2" />
                Quay lại
              </Button>
            </div>
          )}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <Logo className="text-white" size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl">Đăng Ký</CardTitle>
          <CardDescription>
            Tạo tài khoản mới cho cửa hàng hoa quả
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Tên cửa hàng</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Nhập tên cửa hàng"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  id="password"
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng ký...
                </>
              ) : (
                'Đăng Ký'
              )}
            </Button>
          </form>

          {onBack && (
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={onBack}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Đăng nhập
                </button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertComponent />
    </div>
  );
}

