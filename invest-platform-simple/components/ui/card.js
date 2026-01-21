import { cn } from '@/lib/utils';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={cn('bg-white rounded-xl shadow-sm border border-gray-100', className)}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={cn('p-6 border-b border-gray-100', className)}>
      {children}
    </div>
  );
};

const CardContent = ({ children, className = '' }) => {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
};

const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={cn('p-6 border-t border-gray-100', className)}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardContent, CardFooter };
