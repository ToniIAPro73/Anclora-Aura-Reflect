import React from 'react';
import { GeneratedImage } from '../types';

interface ImageCardProps {
  image: GeneratedImage;
  isSelected: boolean;
  onSelect: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`relative rounded-lg overflow-hidden cursor-pointer transform transition-all duration-300 ease-in-out shadow-lg hover:scale-105 ${
        isSelected
          ? 'ring-4 ring-offset-2 ring-offset-gray-900 ring-purple-500 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50'
          : 'hover:shadow-purple-500/20'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
      )}
      <img src={image.src} alt="Generated moodboard" className="w-full h-full object-cover aspect-square" />
      <div className="absolute inset-0 bg-black opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
    </div>
  );
};

export default ImageCard;
