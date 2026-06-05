interface ImagePlaceholderProps {
  aspect?: string
  index?: number
  className?: string
}

export default function ImagePlaceholder({
  aspect = '3/4',
  index = 0,
  className = '',
}: ImagePlaceholderProps) {
  const tones = [
    ['#d8d2ca', '#e8e2da', '#c0b8b0'],
    ['#ccc4bc', '#e0dad2', '#cac2ba'],
    ['#d4cec6', '#e4ded6', '#c4bcb4'],
    ['#c8c0b8', '#dcd4cc', '#beb6ae'],
    ['#d0c8c0', '#e2dcd4', '#c6beb6'],
  ]
  const [t1, t2, t3] = tones[index % tones.length]

  return (
    <div
      className={`w-full bg-stone/10 ${className}`}
      style={{
        aspectRatio: aspect,
        background: `linear-gradient(155deg, ${t1} 0%, ${t2} 45%, ${t3} 100%)`,
      }}
    />
  )
}
