
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center p-3 md:p-4 mb-1 relative fade-in-up">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-100 tracking-tight">
        Aura <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-teal-400 bg-clip-text text-transparent title-shimmer">Reflect</span>
      </h1>
      <p className="mt-2 text-sm md:text-base text-gray-400 max-w-2xl mx-auto">
        Refleja tus ideas y emociones en un lienzo visual generado por IA.
      </p>
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full -mt-4 w-[50vw] max-w-2xl h-16 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-teal-400 blur-xl opacity-20 hero-glow" />
    </header>
  );
};

export default Header;
