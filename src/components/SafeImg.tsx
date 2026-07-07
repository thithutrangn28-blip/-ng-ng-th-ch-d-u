import React, { useState, useEffect } from "react";

export function SafeImg({ src, alt = "", className = "", style = {}, fallbackText = "🌸" }: any) {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error || typeof src !== "string" || src.trim().length === 0) {
    return (
      <div 
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
  
  return (
    <img
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
