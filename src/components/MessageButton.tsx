import { MessageCircle } from 'lucide-react';

interface MessageButtonProps {
  userId: string;
  username: string;
  onClick: (userId: string) => void;
  className?: string;
}

export default function MessageButton({
  userId,
  username,
  onClick,
  className = '',
}: MessageButtonProps) {
  return (
    <button
      onClick={() => onClick(userId)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 ${className}`}
      title={`Message ${username}`}
    >
      <MessageCircle className="w-4 h-4" />
      <span className="hidden sm:inline">Message</span>
    </button>
  );
}
