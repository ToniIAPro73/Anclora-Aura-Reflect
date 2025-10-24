
import React, { useState, useEffect } from 'react';
import { GeneratedImage } from '../types';

interface RefinePanelProps {
  onSubmit: (refinePrompt: string) => void;
  onReset: () => void;
  isLoading: boolean;
  selectedImages: GeneratedImage[];
  onSave: () => void;
  onDownload: () => void;
}

const RefinePanel: React.FC<RefinePanelProps> = ({ onSubmit, onReset, isLoading, selectedImages, onSave, onDownload }) => {
  const [refinePrompt, setRefinePrompt] = useState('');
  const hasSelection = selectedImages.length > 0;

  useEffect(() => {
    if (!hasSelection) {
      setRefinePrompt('');
    }
  }, [hasSelection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refinePrompt.trim() && !isLoading && hasSelection) {
      onSubmit(refinePrompt);
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 w-full bg-black/30 backdrop-blur-xl border-t border-purple-500/20 p-4 shadow-2xl mt-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-gray-200">Refinar o Guardar</h2>
          <p className="text-gray-400">{hasSelection ? `Has seleccionado ${selectedImages.length} imagen(es).` : 'Selecciona una o más imágenes para refinar.'}</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
          {hasSelection && (
            <div className="flex-shrink-0 flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                {selectedImages.map(img => (
                  <img key={img.id} src={img.src} alt="Selected for refinement" className="w-12 h-12 md:w-16 md:h-16 rounded-md object-cover border-2 border-purple-500"/>
                ))}
            </div>
          )}
          <input
            type="text"
            className="w-full flex-grow bg-black/30 border border-purple-500/30 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 placeholder-gray-500 disabled:opacity-50"
            placeholder={hasSelection ? "Ej: 'combinar estilos', 'más oscuro'..." : "Selecciona una o más imágenes"}
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            disabled={isLoading || !hasSelection}
          />
          <div className="flex w-full md:w-auto items-center gap-2">
            <button
              type="submit"
              disabled={isLoading || !refinePrompt.trim() || !hasSelection}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Refinar
            </button>
             <button
              type="button"
              onClick={onDownload}
              disabled={isLoading || !hasSelection}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Descargar
            </button>
             <button
              type="button"
              onClick={onSave}
              disabled={isLoading}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={isLoading}
              className="w-full sm:w-auto flex-shrink-0 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Nuevo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefinePanel;
