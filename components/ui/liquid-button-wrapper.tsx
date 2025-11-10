'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Liquid, type Colors } from './liquid-button';

type LiquidButtonProps = {
  href: string;
};

export const LiquidButton: React.FC<LiquidButtonProps> = ({ href }) => {
  const [isHovered, setIsHovered] = useState(false);

  const colors: Colors = {
    color1: '#8B5CF6', // violet-500
    color2: '#A78BFA', // violet-400
    color3: '#7C3AED', // violet-600
    color4: '#6366F1', // indigo-500
    color5: '#4F46E5', // indigo-600
    color6: '#3B82F6', // blue-500
    color7: '#2563EB', // blue-600
    color8: '#1D4ED8', // blue-700
    color9: '#60A5FA', // blue-400
    color10: '#93C5FD', // blue-300
    color11: '#EC4899', // pink-500
    color12: '#F472B6', // pink-400
    color13: '#DB2777', // pink-600
    color14: '#BE185D', // pink-700
    color15: '#4F46E5', // indigo-600
    color16: '#2563EB', // blue-600
    color17: '#7C3AED', // violet-600
  };

  return (
    <Link
      href={href}
      className="group relative inline-block overflow-hidden rounded-full px-8 py-4 text-lg font-semibold"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <Liquid isHovered={isHovered} colors={colors} />
      </div>
      <span className="relative z-10 flex items-center gap-2 text-white">
        Start Chatting
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
};
