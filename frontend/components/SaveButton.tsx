import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { SavedEventsService } from '../services/savedEvents';

interface SaveButtonProps {
  eventId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const SaveButton: React.FC<SaveButtonProps> = ({ 
  eventId, 
  className = '', 
  size = 'md',
  showText = false 
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check initial saved status from cache
  useEffect(() => {
    setIsSaved(SavedEventsService.isEventSavedLocally(eventId));
  }, [eventId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Optimistic update
    const previousState = isSaved;
    setIsSaved(!isSaved);
    
    try {
      const newSavedState = await SavedEventsService.toggleSaved(eventId, previousState);
      setIsSaved(newSavedState);
    } catch (error) {
      // Revert on error
      setIsSaved(previousState);
      console.error('Failed to toggle save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const buttonSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        ${buttonSizeClasses[size]}
        ${isSaved ? 'text-red-500' : 'text-zinc-400 hover:text-red-400'}
        transition-all duration-200
        ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        ${showText ? 'flex items-center gap-2' : ''}
        hover:scale-110
        ${className}
      `}
      title={isSaved ? 'Remove from saved' : 'Save event'}
      aria-label={isSaved ? 'Remove from saved' : 'Save event'}
    >
      <Heart 
        className={`${sizeClasses[size]} ${isSaved ? 'fill-current' : ''} transition-all`} 
      />
      {showText && (
        <span className="text-sm font-medium">
          {isSaved ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
};

export default SaveButton;
