
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center p-4 md:p-6 mb-2 relative fade-in-up">
      <h1 className="text-5xl md:text-6xl font-extrabold text-gray-100 tracking-tight">
        Aura <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-teal-400 bg-clip-text text-transparent title-shimmer">Reflect</span>
      </h1>
      <p className="mt-3 text-md md:text-lg text-gray-400 max-w-2xl mx-auto">
        Refleja tus ideas y emociones en un lienzo visual generado por IA.
      </p>
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full -mt-5 w-[60vw] max-w-3xl h-24 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-teal-400 blur-2xl opacity-25 hero-glow" />
    </header>
  );
};

export default Header;
