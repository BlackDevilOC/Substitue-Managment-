interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  description, 
  variant = 'primary',
  onClick,
  className = ''
}: StatsCardProps) {
  return (
    <div 
      className={cn("p-4 rounded-lg border shadow-sm", {
        "bg-blue-50 border-blue-100": variant === 'primary',
        "bg-green-50 border-green-100": variant === 'success',
        "bg-yellow-50 border-yellow-100": variant === 'warning',
        "bg-red-50 border-red-100": variant === 'danger',
      }, className)}
      onClick={onClick}
    >
      {icon}
      <div className="mt-2">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}