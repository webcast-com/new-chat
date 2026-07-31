import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'premium' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
};

export function Button({ className = '', variant = 'default', size = 'default', ...props }: ButtonProps) {
  const variantClass = variant === 'premium'
    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90'
    : variant === 'outline'
      ? 'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
      : variant === 'secondary'
        ? 'bg-white/15 text-white hover:bg-white/25'
        : 'bg-blue-600 text-white hover:bg-blue-700';
  const sizeClass = size === 'lg' ? 'h-11 px-6 text-base' : size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm';

  return <button {...props} className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all disabled:pointer-events-none disabled:opacity-50 ${sizeClass} ${variantClass} ${className}`} />;
}

export function Card({ className = '', style, ...props }: HTMLAttributes<HTMLDivElement> & { style?: CSSProperties }) {
  return <div {...props} style={style} className={`flex flex-col gap-6 rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white ${className}`} />;
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`flex flex-col space-y-1.5 p-6 ${className}`} />;
}

export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} className={`text-lg font-semibold leading-none tracking-tight ${className}`} />;
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`px-6 ${className}`} />;
}

export function Badge({ className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return <span {...props} className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`} />;
}
