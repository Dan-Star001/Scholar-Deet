import React from 'react';
import { useTheme } from '@mui/material/styles';

interface LogoProps {
  className?: string;
  size?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className, size = "100%" }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Specific colors requested by the user
  const primaryColor = isDark ? "#e4eff1" : "#2a2c41";
  const secondaryColor = isDark ? "#1a1a1a" : "#8ad9e2";

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background shape with secondary color */}
      <rect width="512" height="512" rx="128" fill={secondaryColor} />
      
      {/* Graduation Cap / Book Icon with primary color */}
      <path 
        d="M256 120L64 210L256 300L448 210L256 120Z" 
        fill={primaryColor} 
      />
      <path 
        d="M100 240V340C100 340 160 380 256 380C352 380 412 340 412 340V240L256 320L100 240Z" 
        fill={primaryColor} 
      />
      <rect x="420" y="210" width="15" height="120" rx="7.5" fill={primaryColor} />
      
      {/* "S" for Scholar-Deet */}
      <path 
        d="M230 180H282V195H230V180ZM230 215H282V230H230V215ZM230 250H282V265H230V250Z" 
        fill={secondaryColor} 
        opacity="0.8"
      />
    </svg>
  );
};
