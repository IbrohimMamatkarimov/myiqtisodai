import Image from 'next/image';

export function CoachAvatar({ size = 56 }: { size?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-full shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src="/coach-avatar.png"
        alt="IqtisodAI"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </div>
  );
}
