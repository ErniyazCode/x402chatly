"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Eye } from "lucide-react";
import { AIModel, AI_MODEL_PRICING, AI_MODEL_NAMES } from "@/lib/ai-providers";

interface ModelSelectorProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
  disabled?: boolean;
  compact?: boolean;
}

const MODEL_OPTIONS: AIModel[] = ['deepseek', 'gpt-5', 'claude-sonnet-4-5'];

const MODEL_ICONS: Record<AIModel, string> = {
  'deepseek': '/deepseek.png',
  'gpt-5': '/gpt-white.png',
  'claude-sonnet-4-5': '/claude.png',
};

// Vision support indicator
const MODEL_VISION_SUPPORT: Record<AIModel, boolean> = {
  'deepseek': false,
  'gpt-5': true,
  'claude-sonnet-4-5': true,
};

export function ModelSelector({ selectedModel, onModelChange, disabled = false, compact = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/80 hover:bg-accent/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl shadow-sm hover:shadow-md"
          title={`Current: ${AI_MODEL_NAMES[selectedModel]}`}
        >
          <img 
            src={MODEL_ICONS[selectedModel]} 
            alt={AI_MODEL_NAMES[selectedModel]} 
            className="w-6 h-6 object-contain"
          />
          {MODEL_VISION_SUPPORT[selectedModel] && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 shadow-lg">
              <Eye className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)}
              />
              
              {/* Dropdown */}
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl bg-background/95 border border-border/50 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-2">
                  {MODEL_OPTIONS.map((model) => {
                    const isSelected = model === selectedModel;
                    const hasVision = MODEL_VISION_SUPPORT[model];
                    return (
                      <button
                        key={model}
                        onClick={() => {
                          onModelChange(model);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                          isSelected 
                            ? 'bg-linear-to-r from-violet-500/20 to-blue-500/20 border border-violet-500/30' 
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        <div className="relative">
                          <img 
                            src={MODEL_ICONS[model]} 
                            alt={AI_MODEL_NAMES[model]} 
                            className="w-6 h-6 object-contain"
                          />
                          {hasVision && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-violet-500">
                              <Eye className="w-2 h-2 text-white" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col items-start">
                          <span className="text-sm font-medium text-foreground">
                            {AI_MODEL_NAMES[model]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ${AI_MODEL_PRICING[model].toFixed(2)} per message
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-violet-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl"
      >
        <img 
          src={MODEL_ICONS[selectedModel]} 
          alt={AI_MODEL_NAMES[selectedModel]} 
          className="w-5 h-5 object-contain"
        />
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {AI_MODEL_NAMES[selectedModel]}
            </span>
            {MODEL_VISION_SUPPORT[selectedModel] && (
              <span title="Supports image analysis">
                <Eye className="w-3.5 h-3.5 text-violet-400" />
              </span>
            )}
          </div>
          <span className="text-xs text-white/60">
            ${AI_MODEL_PRICING[selectedModel].toFixed(2)} per message
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-full min-w-[280px] rounded-xl bg-black/90 border border-white/10 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-2">
                {MODEL_OPTIONS.map((model) => {
                  const isSelected = model === selectedModel;
                  const hasVision = MODEL_VISION_SUPPORT[model];
                  return (
                    <button
                      key={model}
                      onClick={() => {
                        onModelChange(model);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                        isSelected 
                          ? 'bg-linear-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30' 
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <img 
                        src={MODEL_ICONS[model]} 
                        alt={AI_MODEL_NAMES[model]} 
                        className="w-5 h-5 object-contain"
                      />
                      <div className="flex-1 flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {AI_MODEL_NAMES[model]}
                          </span>
                          {hasVision && (
                            <span title="Supports image analysis">
                              <Eye className="w-3 h-3 text-violet-400" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-white/60">
                          ${AI_MODEL_PRICING[model].toFixed(2)} per message
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
