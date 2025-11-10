'use client';
import { motion } from 'framer-motion';
import React from 'react';

type AnimatedTextProps = {
  text: string;
  className?: string;
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({ text, className = '' }) => {
  const words = text.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span
          variants={child}
          key={index}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

export const GlitchText: React.FC<AnimatedTextProps> = ({ text, className = '' }) => {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ 
        opacity: 1, 
        filter: 'blur(0px)',
        textShadow: [
          '0 0 0px rgba(139, 92, 246, 0)',
          '0 0 10px rgba(139, 92, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
          '0 0 0px rgba(139, 92, 246, 0)',
        ]
      }}
      transition={{
        duration: 1.2,
        ease: 'easeOut',
        textShadow: {
          duration: 2,
          repeat: Infinity,
          repeatType: 'reverse',
        }
      }}
    >
      {text}
    </motion.div>
  );
};

export const ParticleText: React.FC<AnimatedTextProps> = ({ text, className = '' }) => {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const letters = text.split('');
  
  // Generate stable random values using index as seed - memoized per letter
  const particleStates = React.useMemo(() => {
    const getStableRandom = (index: number, seed: number) => {
      const x = Math.sin(index * seed) * 10000;
      return x - Math.floor(x);
    };

    return letters.map((letter, index) => ({
      letter,
      xOffset: (getStableRandom(index, 12.9898) * 100) - 50,
      yOffset: (getStableRandom(index, 78.233) * 100) - 50,
      rotation: (getStableRandom(index, 43.758) * 180) - 90,
    }));
  }, [text]); // Only recalculate if text changes

  // Render static text during SSR to avoid hydration mismatch
  if (!isMounted) {
    return <div className={className}>{text}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {particleStates.map((state, index) => (
        <motion.span
          key={`particle-${index}-${state.letter}`}
          className="inline-block"
          initial={{ 
            opacity: 0, 
            scale: 0,
            x: state.xOffset,
            y: state.yOffset,
            rotate: state.rotation,
          }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            x: 0,
            y: 0,
            rotate: 0,
          }}
          transition={{
            duration: 0.8,
            delay: index * 0.03,
            ease: 'easeOut',
          }}
        >
          {state.letter === ' ' ? '\u00A0' : state.letter}
        </motion.span>
      ))}
    </div>
  );
};
