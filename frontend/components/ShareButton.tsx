import React, { useState, useRef, useEffect } from 'react';
import { Share2, X, Check, Copy, MessageCircle, Linkedin } from 'lucide-react';

// Twitter/X icon component
const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ShareButtonProps {
  eventId: string;
  eventTitle: string;
  eventType?: 'event' | 'hackathon';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  eventId,
  eventTitle,
  eventType = 'event',
  size = 'md',
  variant = 'icon'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Generate shareable URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/${eventType}/${eventId}`;
  const shareText = `Check out "${eventTitle}" on DelhiPulse! 🎉`;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Copy link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share URLs
  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
  };

  // Native share (mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: shareText,
          url: shareUrl
        });
        setIsOpen(false);
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // On mobile, try native share first
    if (typeof navigator.share === 'function' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      handleNativeShare();
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Share Button */}
      {variant === 'icon' ? (
        <button
          onClick={handleShareClick}
          className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 text-zinc-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-zinc-700/80 transition-all duration-200`}
          title="Share event"
        >
          <Share2 className={iconSizes[size]} />
        </button>
      ) : (
        <button
          onClick={handleShareClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-blue-400 hover:border-blue-500/50 transition-all duration-200"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm font-medium">Share</span>
        </button>
      )}

      {/* Share Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-sm font-semibold text-zinc-200">Share Event</span>
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Share Options */}
          <div className="p-2">
            {/* WhatsApp */}
            <button
              onClick={(e) => handleLinkClick(e, shareLinks.whatsapp)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-zinc-300 group-hover:text-white">WhatsApp</span>
            </button>

            {/* Twitter/X */}
            <button
              onClick={(e) => handleLinkClick(e, shareLinks.twitter)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center">
                <TwitterIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-zinc-300 group-hover:text-white">Twitter / X</span>
            </button>

            {/* LinkedIn */}
            <button
              onClick={(e) => handleLinkClick(e, shareLinks.linkedin)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Linkedin className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-sm text-zinc-300 group-hover:text-white">LinkedIn</span>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-zinc-800"></div>

            {/* Copy Link */}
            <button
              onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${copied ? 'bg-green-500/20' : 'bg-zinc-700'}`}>
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
                )}
              </div>
              <span className={`text-sm transition-colors ${copied ? 'text-green-500' : 'text-zinc-300 group-hover:text-white'}`}>
                {copied ? 'Link Copied!' : 'Copy Link'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
