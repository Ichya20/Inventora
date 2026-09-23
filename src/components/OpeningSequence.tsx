import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, CornerDownLeft } from 'lucide-react';
import { Language } from '../i18n';

interface OpeningSequenceProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function OpeningSequence({ lang, onLanguageChange }: OpeningSequenceProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse tilt parallax values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for fluid, organic 3D responsiveness
  const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // 3D rotation mappings
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-14, 14]);

  // Dynamic light position for specular shine
  const shineX = useTransform(smoothX, [-0.5, 0.5], ['20%', '80%']);
  const shineY = useTransform(smoothY, [-0.5, 0.5], ['20%', '80%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  // Keyboard shortcut: Press Enter to enter workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        navigate('/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen w-full bg-[#fafafa] dark:bg-[#080808] text-[#171717] dark:text-[#ededed] flex flex-col items-center justify-center font-sans px-4 overflow-hidden select-none"
      style={{ perspective: 1200 }}
    >
      {/* Precision CAD / Architectural Grid Backdrop with Radial Mask */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(120, 120, 120, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(120, 120, 120, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 15%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 15%, transparent 80%)'
        }}
      />

      {/* Subtle cursor-tracking ambient glow - sleek monochrome */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none blur-[120px] opacity-40 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(140, 140, 140, 0.16) 0%, rgba(80, 80, 80, 0.06) 50%, transparent 70%)',
          x: useTransform(smoothX, [-0.5, 0.5], [-80, 80]),
          y: useTransform(smoothY, [-0.5, 0.5], [-80, 80])
        }}
      />

      {/* Language Toggle in Top Right */}
      <div className="absolute top-6 right-6 z-30 flex items-center rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md p-1 shadow-xs">
        <button
          type="button"
          onClick={() => onLanguageChange('en')}
          className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
            lang === 'en'
              ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717] shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => onLanguageChange('id')}
          className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
            lang === 'id'
              ? 'bg-[#171717] text-white dark:bg-[#ededed] dark:text-[#171717] shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          ID
        </button>
      </div>

      {/* Main 3D Hero Assembly */}
      <div className="relative z-10 flex flex-col items-center gap-10 max-w-xl text-center">
        
        {/* 3D Isometric Logo Monoliths Container */}
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d'
          }}
          className="relative flex items-center justify-center p-8 cursor-grab active:cursor-grabbing"
        >
          {/* Floor Shadow Plane with realistic 3D depth */}
          <motion.div
            style={{
              transform: 'translateZ(-40px) scale(0.9)',
              opacity: isHovered ? 0.35 : 0.25
            }}
            className="absolute inset-4 rounded-3xl bg-neutral-900/40 dark:bg-black/80 blur-2xl transition-opacity duration-300 pointer-events-none"
          />

          {/* 4 Monolithic 3D Tiles representing Inventora's 4 Core Enterprise Pillars */}
          <div 
            className="grid grid-cols-2 gap-3.5 w-32 h-32"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Tile 1: Top-Left Monolith (Onyx Solid Core) */}
            <motion.div
              initial={{ opacity: 0, y: -40, z: 80, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, z: 28, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transform: 'translateZ(28px)',
                transformStyle: 'preserve-3d'
              }}
              className="group relative rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-950 dark:from-[#f5f5f5] dark:to-[#d4d4d4] p-[1px] shadow-[0_12px_24px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
            >
              <div className="w-full h-full rounded-[11px] bg-neutral-900 dark:bg-[#ededed] flex items-center justify-center relative overflow-hidden border-t border-white/20 dark:border-white/60">
                {/* Specular Edge Gleam */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-80 pointer-events-none" />
              </div>
            </motion.div>

            {/* Tile 2: Top-Right Monolith (Frosted Neutral Gray) */}
            <motion.div
              initial={{ opacity: 0, x: 40, z: 60, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, z: 14, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transform: 'translateZ(14px)',
                transformStyle: 'preserve-3d'
              }}
              className="relative rounded-xl bg-gradient-to-br from-neutral-300/60 to-neutral-200/30 dark:from-neutral-700/60 dark:to-neutral-800/30 p-[1px] shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
            >
              <div className="w-full h-full rounded-[11px] bg-neutral-200/50 dark:bg-neutral-800/50 backdrop-blur-md flex items-center justify-center relative overflow-hidden border border-neutral-300/70 dark:border-neutral-700/70">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </motion.div>

            {/* Tile 3: Bottom-Left Monolith (Frosted Neutral Gray) */}
            <motion.div
              initial={{ opacity: 0, x: -40, z: 60, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, z: 14, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transform: 'translateZ(14px)',
                transformStyle: 'preserve-3d'
              }}
              className="relative rounded-xl bg-gradient-to-br from-neutral-300/60 to-neutral-200/30 dark:from-neutral-700/60 dark:to-neutral-800/30 p-[1px] shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
            >
              <div className="w-full h-full rounded-[11px] bg-neutral-200/50 dark:bg-neutral-800/50 backdrop-blur-md flex items-center justify-center relative overflow-hidden border border-neutral-300/70 dark:border-neutral-700/70">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </motion.div>

            {/* Tile 4: Bottom-Right Monolith (Onyx Solid Core with high elevation) */}
            <motion.div
              initial={{ opacity: 0, y: 40, z: 80, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, z: 32, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transform: 'translateZ(32px)',
                transformStyle: 'preserve-3d'
              }}
              className="group relative rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-950 dark:from-[#f5f5f5] dark:to-[#d4d4d4] p-[1px] shadow-[0_14px_28px_rgba(0,0,0,0.2)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.7)]"
            >
              <div className="w-full h-full rounded-[11px] bg-neutral-900 dark:bg-[#ededed] flex items-center justify-center relative overflow-hidden border-t border-white/20 dark:border-white/60">
                <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-80 pointer-events-none" />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Brand Title & Typography */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Inventora
            </h1>
          </div>
          
          <p className="text-xs sm:text-sm uppercase tracking-[0.24em] font-semibold text-neutral-500 dark:text-neutral-400">
            {lang === 'en' ? 'Enterprise Resource Planning' : 'Sistem Perencanaan Sumber Daya Terpadu'}
          </p>

          {/* Clean unboxed architectural metadata */}
          <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
            <span>Procurement</span>
            <span aria-hidden="true">·</span>
            <span>Ledger Automation</span>
            <span aria-hidden="true">·</span>
            <span>Multi-Entity</span>
          </div>
        </motion.div>

        {/* Tactile "Enter Workspace" Action Unit */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <button
            onClick={() => navigate('/login')}
            className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium text-sm transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_4px_24px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>{lang === 'en' ? 'Enter Workspace' : 'Buka Workspace'}</span>
            
            {/* Keyboard shortcut affordance keycap */}
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-neutral-800 dark:bg-neutral-200 text-neutral-300 dark:text-neutral-700 text-[10px] font-mono border border-neutral-700 dark:border-neutral-300">
              <CornerDownLeft className="w-2.5 h-2.5" />
              <span>Enter</span>
            </span>

            <ArrowRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>

          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {lang === 'en' ? 'Click to proceed or press Enter key' : 'Klik tombol atau tekan tombol Enter'}
          </span>
        </motion.div>

      </div>
    </div>
  );
}
