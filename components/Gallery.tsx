import React, { useMemo } from 'react';
import { GeneratedImage } from '../types';

interface GalleryProps {
  galleries: GeneratedImage[][];
  onReset: () => void;
}

const Gallery: React.FC<GalleryProps> = ({ galleries, onReset }) => {
  // Flatten the array of galleries into a single array of images.
  // Reverse the galleries first to show the most recent ones at the top.
  const allImages = useMemo(() => {
    return galleries.slice().reverse().flat();
  }, [galleries]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-200">Mi Galería</h2>
        <button
          onClick={onReset}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2 px-5 rounded-lg transition-all duration-300"
        >
          Crear Nuevo Moodboard
        </button>
      </div>

      {allImages.length > 0 ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {allImages.map((image) => (
            <div key={image.id} className="break-inside-avoid">
              <img
                src={image.src}
                alt="Saved moodboard image"
                className="w-full h-auto object-cover rounded-lg shadow-lg"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
            <p className="text-gray-400">Tu galería está vacía. ¡Guarda tu primer moodboard para verlo aquí!</p>
        </div>
      )}
    </div>
  );
};

export default Gallery;
