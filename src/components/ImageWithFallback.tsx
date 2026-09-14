import { useState } from 'react'

export function ImageWithFallback({ src, alt, className, fallbackText }: {
  src: string; alt: string; className?: string; fallbackText?: string
}) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 text-zinc-600 ${className}`}>
        <span className="text-2xl font-bold">{fallbackText || alt.charAt(0)}</span>
      </div>
    )
  }

  return (
    <>
      {!loaded && <div className={`absolute inset-0 skeleton rounded-xl`} />}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
    </>
  )
}
