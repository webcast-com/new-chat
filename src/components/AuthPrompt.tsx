import { LogIn, X } from 'lucide-react';

interface AuthPromptProps {
  isOpen: boolean;
  onClose: () => void;
  action: string;
}

export default function AuthPrompt({ isOpen, onClose, action }: AuthPromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-full">
              <LogIn className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Sign In Required</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-600 mb-6">
          You need to sign in to {action}. Create an account or log in to your existing account.
        </p>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-500 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-violet-600 transition-all"
          >
            Continue to Sign In
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-all"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          Your account keeps your data private and secure
        </p>
      </div>
    </div>
  );
}
