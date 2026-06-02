import React, { useState } from 'react';
import { Edit2, Trash2, Tag, Clock, Star, ChevronRight } from 'lucide-react';
import { Memory } from '../types';
import { CATEGORY_BG, CATEGORY_COLORS, SOURCE_ICONS, SOURCE_COLORS } from '../utils/constants';
import { useMemoryStore } from '../store/memoryStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';

interface MemoryCardProps {
  memory: Memory;
  onEdit?: (memory: Memory) => void;
  onClick?: (memory: Memory) => void;
  similarity?: number;
  compact?: boolean;
}

export default function MemoryCard({ memory, onEdit, onClick, similarity, compact }: MemoryCardProps) {
  const { deleteMemory, updateMemory } = useMemoryStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      deleteMemory(memory.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2000);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(memory);
  };

  const handleStarClick = (e: React.MouseEvent, stars: number) => {
    e.stopPropagation();
    updateMemory(memory.id, { importance: stars });
  };

  const categoryColor = CATEGORY_COLORS[memory.category];
  const importanceStars = memory.importance || 3;

  return (
    <div
      onClick={() => onClick?.(memory)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative glass rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden',
        'hover:-translate-y-0.5',
        compact ? 'p-4' : 'p-5'
      )}
      style={{
        boxShadow: hovered
          ? `0 12px 40px ${categoryColor}20, 0 0 0 1px ${categoryColor}40, inset 0 1px 0 rgba(255,255,255,0.05)`
          : undefined,
      }}
    >
      {/* Gradient accent line (left) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300"
        style={{
          background: `linear-gradient(180deg, ${categoryColor} 0%, transparent 100%)`,
          opacity: hovered ? 1 : 0.6,
        }}
      />

      {/* Glow on hover */}
      {hovered && (
        <div
          className="absolute -inset-px rounded-2xl opacity-20 blur-xl pointer-events-none -z-10"
          style={{ background: categoryColor }}
        />
      )}

      {/* Similarity badge */}
      {similarity !== undefined && (
        <div className="absolute top-3 right-3 glass-strong rounded-full px-2.5 py-0.5 text-[10px] font-mono text-violet-200 flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
          {Math.round(similarity * 100)}% match
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider', CATEGORY_BG[memory.category])}>
            {memory.category}
          </span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', SOURCE_COLORS[memory.source])}>
            {SOURCE_ICONS[memory.source]} {memory.source}
          </span>
        </div>
        {!compact && (
          <div className={cn(
            'flex items-center gap-0.5 transition-all duration-200',
            hovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
          )}>
            <button
              onClick={handleEdit}
              className="p-1.5 text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={handleDelete}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                confirmDelete
                  ? 'text-red-300 bg-red-500/20 border border-red-500/30'
                  : 'text-gray-400 hover:text-red-300 hover:bg-red-500/10'
              )}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <p className={cn(
        'text-gray-100 leading-relaxed font-normal',
        compact ? 'text-[13px] line-clamp-2' : 'text-sm line-clamp-3'
      )}>
        {memory.content}
      </p>

      {/* Footer */}
      {!compact && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Importance stars */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={(e) => handleStarClick(e, star)}
                  className={cn(
                    'transition-all hover:scale-110',
                    star <= importanceStars ? 'text-amber-400' : 'text-gray-700 hover:text-gray-500'
                  )}
                >
                  <Star size={11} fill={star <= importanceStars ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <div className="w-px h-3 bg-white/10" />
            {/* Tags */}
            <div className="flex items-center gap-1.5">
              {memory.tags.slice(0, 2).map(tag => (
                <span key={tag} className="flex items-center gap-0.5 text-[10px] text-gray-400 font-mono">
                  <Tag size={9} />
                  {tag}
                </span>
              ))}
              {memory.tags.length > 2 && (
                <span className="text-[10px] text-gray-600 font-mono">+{memory.tags.length - 2}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
            <Clock size={9} />
            {formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}
          </div>
        </div>
      )}

      {compact && (
        <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{memory.project_name}</span>
          <ChevronRight size={12} className="text-gray-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      )}
    </div>
  );
}
