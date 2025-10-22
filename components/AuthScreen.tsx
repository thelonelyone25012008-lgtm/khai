import React, { useState } from 'react';
import { NovaIcon, BrandmarkIcon } from './Icons';
import { loginUser, registerUser } from '../services/dbService';
import Spinner from './Spinner';

interface AuthScreenProps {
  onLogin: (username: string) => void;
  onContinueAsGuest: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onContinueAsGuest }) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError('Tên người dùng phải có ít nhất 3 ký tự.');
      return;
    }
    if (password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
    }
    setError('');
    setIsLoading(true);

    try {
        const result = authMode === 'LOGIN'
            ? await loginUser(username.trim(), password)
            : await registerUser(username.trim(), password);
            
        if (result.success) {
            // Đăng nhập người dùng khi đăng nhập hoặc đăng ký thành công
            onLogin(username.trim());
        } else {
            setError(result.error || 'Đã xảy ra lỗi không xác định.');
            setIsLoading(false);
        }
    } catch (err) {
        console.error(err);
        setError('Không thể kết nối với bộ nhớ cục bộ.');
        setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
      setAuthMode(prev => (prev === 'LOGIN' ? 'REGISTER' : 'LOGIN'));
      setError('');
  };

  return (
    <div className="grid place-items-center min-h-screen font-sans bg-slate-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <div className="w-full max-w-md text-center flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center">
            <div className="flex flex-row items-center justify-center gap-0">
                <NovaIcon className="w-64 h-64 text-indigo-500 dark:text-indigo-400" />
                <BrandmarkIcon className="h-32 text-gray-800 dark:text-gray-200" />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-8">Trợ lý học tập AI của bạn</p>
        </div>

        <form onSubmit={handleAuth} className="w-full space-y-4">
          <div>
            <label htmlFor="username" className="sr-only">Tên người dùng</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              placeholder="Tên người dùng"
              className="w-full px-4 py-3 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby="auth-error"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Mật khẩu"
              className="w-full px-4 py-3 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby="auth-error"
              autoComplete="current-password"
            />
          </div>
          {error && <p id="auth-error" className="text-red-500 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors disabled:bg-blue-400 flex items-center justify-center"
          >
            {isLoading ? <Spinner /> : (authMode === 'LOGIN' ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {authMode === 'LOGIN' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button 
                type="button"
                onClick={toggleAuthMode}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none bg-transparent border-none p-0 cursor-pointer"
            >
                {authMode === 'LOGIN' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
        </p>

        <div className="my-2 flex items-center w-full">
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-sm">hoặc</span>
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        
        <button
          type="button"
          onClick={onContinueAsGuest}
          className="w-full px-4 py-3 font-semibold text-blue-600 dark:text-blue-400 bg-transparent rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
        >
          {'Tiếp tục với tư cách khách'}
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            <strong>Lưu ý:</strong> Tính năng đăng nhập này chỉ để minh họa và không an toàn. Không sử dụng mật khẩu thật.
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;