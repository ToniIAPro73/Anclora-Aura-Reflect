import React, { useState, useCallback, useMemo } from "react";
import { AppState, GeneratedImage } from "./types";
import { generateInitialImages, refineImages } from "./services/localService";
import Header from "./components/Header";
import PromptForm from "./components/PromptForm";
import ImageGrid from "./components/ImageGrid";
import Spinner from "./components/Spinner";
import RefinePanel from "./components/RefinePanel";
import Gallery from "./components/Gallery";
import { LOADING_MESSAGES } from "./constants";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [galleries, setGalleries] = useState<GeneratedImage[][]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>(
    LOADING_MESSAGES[0]
  );

  const isLoading =
    appState === AppState.GENERATING || appState === AppState.REFINING;

  const handleGenerate = useCallback(
    async (prompt: string, aspectRatio: string, temperature: number) => {
      setAppState(AppState.GENERATING);
      setError(null);
      setSelectedImageIds([]);

      const intervalId = setInterval(() => {
        setLoadingMessage((prev) => {
          const currentIndex = LOADING_MESSAGES.indexOf(prev);
          return LOADING_MESSAGES[(currentIndex + 1) % LOADING_MESSAGES.length];
        });
      }, 2500);

      try {
        const generatedImages = await generateInitialImages(
          prompt,
          aspectRatio,
          temperature
        );
        const formattedImages: GeneratedImage[] = generatedImages.map(
          (src, index) => ({
            id: `img-${Date.now()}-${index}`,
            src: `data:image/png;base64,${src}`,
          })
        );
        setImages(formattedImages);
        setAppState(AppState.RESULTS);
      } catch (err) {
        console.error(err);
        setError("Failed to generate images. Please try again.");
        setAppState(AppState.INITIAL);
      } finally {
        clearInterval(intervalId);
      }
    },
    []
  );

  const selectedImages = useMemo(() => {
    return images.filter((img) => selectedImageIds.includes(img.id));
  }, [images, selectedImageIds]);

  const handleRefine = useCallback(
    async (refinePrompt: string) => {
      if (selectedImages.length === 0 || !refinePrompt) {
        setError(
          "Please select at least one image and provide a refinement prompt."
        );
        return;
      }

      setAppState(AppState.REFINING);
      setError(null);

      const intervalId = setInterval(() => {
        setLoadingMessage((prev) => {
          const currentIndex = LOADING_MESSAGES.indexOf(prev);
          return LOADING_MESSAGES[(currentIndex + 1) % LOADING_MESSAGES.length];
        });
      }, 2500);

      try {
        const baseImageSrcs = selectedImages.map((img) => img.src);
        const refinedImageSrcs = await refineImages(
          baseImageSrcs,
          refinePrompt
        );
        const formattedImages: GeneratedImage[] = refinedImageSrcs.map(
          (src, index) => ({
            id: `img-refined-${Date.now()}-${index}`,
            src: `data:image/png;base64,${src}`,
          })
        );
        setImages(formattedImages);
        setSelectedImageIds([]);
        setAppState(AppState.RESULTS);
      } catch (err) {
        console.error(err);
        setError("Failed to refine images. Please try again.");
        setAppState(AppState.RESULTS); // Go back to results to allow another try
      } finally {
        clearInterval(intervalId);
      }
    },
    [selectedImages]
  );

  const handleReset = () => {
    setAppState(AppState.INITIAL);
    setImages([]);
    setSelectedImageIds([]);
    setError(null);
  };

  const handleImageSelect = useCallback((id: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((prevId) => prevId !== id) : [...prev, id]
    );
  }, []);

  const handleSaveToGallery = useCallback(() => {
    if (images.length > 0) {
      setGalleries((prev) => [...prev, images]);
      setAppState(AppState.GALLERY);
      setImages([]);
      setSelectedImageIds([]);
    }
  }, [images]);

  const handleDownload = useCallback(() => {
    selectedImages.forEach((image, index) => {
      const link = document.createElement("a");
      link.href = image.src;
      link.download = `aura-reflect-${Date.now()}-${index}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }, [selectedImages]);

  return (
    <div className="min-h-screen text-white font-sans flex flex-col items-center p-4">
      {isLoading && <Spinner message={loadingMessage} />}
      <div className="w-full max-w-7xl mx-auto">
        <Header />
        <main>
          {error && (
            <div
              className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 text-red-300 px-4 py-3 rounded-lg relative text-center mb-6"
              role="alert"
            >
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {appState === AppState.INITIAL && (
            <PromptForm onSubmit={handleGenerate} isLoading={isLoading} />
          )}

          {(appState === AppState.RESULTS ||
            appState === AppState.REFINING) && (
            <>
              <ImageGrid
                images={images}
                selectedImageIds={selectedImageIds}
                onImageSelect={handleImageSelect}
                dimmed={appState === AppState.REFINING}
              />
              <RefinePanel
                onSubmit={handleRefine}
                onReset={handleReset}
                isLoading={isLoading}
                selectedImages={selectedImages}
                onSave={handleSaveToGallery}
                onDownload={handleDownload}
              />
            </>
          )}

          {appState === AppState.GALLERY && (
            <Gallery galleries={galleries} onReset={handleReset} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
