import React, { useState, useEffect, useRef } from "react";

export function SafeImg({ src, alt = "", className = "", style = {}, fallbackText = "🌸" }: any) {
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<any>(null);
  
  useEffect(() => {
    setError(false);
    // When src changes, we want to re-evaluate visibility in case it was already loaded
  }, [src]);

  useEffect(() => {
    if (!src || error) return;
    
    // Fallback if IntersectionObserver is not available or supported
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "350px", // Preload images 350px before they enter viewport for ultra-smooth scrolling
        threshold: 0.01,
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, error]);

  if (!src || error || typeof src !== "string" || src.trim().length === 0) {
    return (
      <div 
        ref={imgRef}
        className={`safe-img-fallback ${className}`} 
        style={{
          width: style.width || '100%', 
          height: style.height || '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'linear-gradient(135deg, #ffddea 0%, #fce4ec 100%)', 
          color: '#d23a73', 
          fontSize: '1.1rem',
          objectFit: style.objectFit || 'cover',
          ...style
        }}
      >
        <span>{fallbackText}</span>
      </div>
    );
  }
  
  if (!isVisible) {
    return (
      <div 
        ref={imgRef}
        className={`safe-img-placeholder ${className}`} 
        style={{
          width: style.width || '100%', 
          height: style.height || '100%', 
          background: 'linear-gradient(135deg, #fff3f6 0%, #ffe9f0 100%)', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f48fb1',
          fontSize: '1rem',
          borderRadius: style.borderRadius || undefined,
          ...style
        }}
      >
        <span>🌸</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
    />
  );
}
