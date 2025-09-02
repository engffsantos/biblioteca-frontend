
import React from 'react';

interface BadgeProps {
  text: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  className?: string;
}

const colorClasses = {
  blue: 'bg-blue-accent/20 text-blue-accent',
  green: 'bg-green-accent/20 text-green-accent',
  purple: 'bg-purple-accent/20 text-purple-accent',
  orange: 'bg-orange-accent/20 text-orange-accent',
  red: 'bg-red-accent/20 text-red-accent',
};

const Badge: React.FC<BadgeProps> = ({ text, color, className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]} ${className}`}>
      {text}
    </span>
  );
};

export default Badge;
