interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  className?: string;
  linkTo?: string; // Added linkTo prop
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  description, 
  variant = 'primary',
  onClick,
  className = '',
  linkTo, // Added linkTo prop
}: StatsCardProps) {
  const handleClick = () => {
    if (linkTo) {
      window.location.href = linkTo; // Redirect using window.location.href
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={cn("p-4 rounded-lg border shadow-sm cursor-pointer hover:opacity-90 transition-opacity", { // Added cursor and hover styles
        "bg-blue-50 border-blue-100": variant === 'primary',
        "bg-green-50 border-green-100": variant === 'success',
        "bg-yellow-50 border-yellow-100": variant === 'warning',
        "bg-red-50 border-red-100": variant === 'danger',
      }, className)}
      onClick={linkTo ? handleClick : onClick} // Use handleClick if linkTo is provided, otherwise use original onClick
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