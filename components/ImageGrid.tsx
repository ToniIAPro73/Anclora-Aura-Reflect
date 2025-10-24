import React from 'react';
import { GeneratedImage } from '../types';
import ImageCard from './ImageCard';

interface ImageGridProps {
  images: GeneratedImage[];
  selectedImageIds: string[];
  onImageSelect: (id: string) => void;
  dimmed?: boolean;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, selectedImageIds, onImageSelect, dimmed }) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-2 gap-4 mb-8 transition-opacity duration-500 ${dimmed ? 'opacity-30' : 'opacity-100'}`}>
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          isSelected={selectedImageIds.includes(image.id)}
          onSelect={() => onImageSelect(image.id)}
        />
      ))}
    </div>
  );
};

export default ImageGrid;