import { cn } from '@/lib/utils';

const Table = ({ children, className = '' }) => {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ children, className = '' }) => {
  return (
    <thead className={cn('bg-gray-50', className)}>
      <tr>{children}</tr>
    </thead>
  );
};

const TableRow = ({ children, className = '' }) => {
  return (
    <tr className={cn('border-b border-gray-100 hover:bg-gray-50 transition-colors', className)}>
      {children}
    </tr>
  );
};

const TableHead = ({ children, className = '' }) => {
  return (
    <th className={cn('px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', className)}>
      {children}
    </th>
  );
};

const TableCell = ({ children, className = '' }) => {
  return (
    <td className={cn('px-6 py-4 whitespace-nowrap text-sm text-gray-900', className)}>
      {children}
    </td>
  );
};

export { Table, TableHeader, TableRow, TableHead, TableCell };
