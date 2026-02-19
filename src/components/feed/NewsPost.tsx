'use client';

import { FeedPost, NewsData } from '@/lib/types';
import Image from 'next/image';

export default function NewsPost({ post }: { post: FeedPost }) {
  const data = post.data as NewsData;

  const content = (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary leading-snug">
          {data.headline}
        </p>
        {data.description && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
            {data.description}
          </p>
        )}
        {data.linkUrl && (
          <span className="text-xs text-accent-green mt-2 inline-block">
            Read on ESPN →
          </span>
        )}
      </div>
      {data.imageUrl && (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={data.imageUrl}
            alt={data.headline}
            fill
            className="object-cover"
          />
        </div>
      )}
    </div>
  );

  if (data.linkUrl) {
    return (
      <a href={data.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}
