import React, { useState, useCallback, useMemo, useEffect } from "react";
import { AppState, GeneratedImage, LocalEngineConfig, EngineMode } from "./types";
import * as localEngine from "./services/localEngineService";
import * as cloudEngine from "./services/cloudEngineService";
import Header from "./components/Header";
import PromptForm from "./components/PromptForm";
import ImageGrid from "./components/ImageGrid";
import Spinner from "./components/Spinner";
import RefinePanel from "./components/RefinePanel";
import Gallery from "./components/Gallery";
import EngineStatus from "./components/EngineStatus";
import { LOADING_MESSAGES } from "./constants";

const DEFAULT_ENGINE_CONFIG: LocalEngineConfig = {
  modelPath: "",
  steps: 20,
  guidanceScale: 7.5,
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [galleries, setGalleries] = useState<GeneratedImage[][]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>(
    LOADING_MESSAGES[0]
  );
  const [engineConfig, setEngineConfig] = useState<LocalEngineConfig>(
    DEFAULT_ENGINE_CONFIG
  );
  const [engineMode, setEngineMode] = useState<EngineMode>(EngineMode.AUTO);
  const [localHealth, setLocalHealth] = useState<{ ok: boolean; data?: any; error?: string } | null>(null);
  const [cloudHealth, setCloudHealth] = useState<{ ok: boolean; data?: any; error?: string } | null>(null);
  const [refreshingHealth, setRefreshingHealth] = useState<boolean>(false);

  const localUrl = (import.meta.env.VITE_LOCAL_ENGINE_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const cloudUrl = (import.meta.env.VITE_CLOUD_ENGINE_URL ?? "").replace(/\/$/, "");
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
        let generatedImages: string[] = [];
        if (engineMode === EngineMode.CLOUD) {
          generatedImages = await cloudEngine.generateInitialImages(
            prompt,
            aspectRatio,
            temperature,
            engineConfig
          );
        } else if (engineMode === EngineMode.LOCAL) {
          generatedImages = await localEngine.generateInitialImages(
            prompt,
            aspectRatio,
            temperature,
            engineConfig,
            { disableFallback: true }
          );
        } else {
          // Auto (fallback)
          generatedImages = await localEngine.generateInitialImages(
            prompt,
            aspectRatio,
            temperature,
            engineConfig
          );
        }
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
    [engineMode, engineConfig]
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
        let refinedImageSrcs: string[] = [];
        if (engineMode === EngineMode.CLOUD) {
          refinedImageSrcs = await cloudEngine.refineImages(
            baseImageSrcs,
            refinePrompt,
            engineConfig
          );
        } else if (engineMode === EngineMode.LOCAL) {
          refinedImageSrcs = await localEngine.refineImages(
            baseImageSrcs,
            refinePrompt,
            engineConfig,
            { disableFallback: true }
          );
        } else {
          // Auto (fallback)
          refinedImageSrcs = await localEngine.refineImages(
            baseImageSrcs,
            refinePrompt,
            engineConfig
          );
        }
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
    [selectedImages, engineMode, engineConfig]
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

  const runHealthCheck = useCallback(async () => {
    setRefreshingHealth(true);
    try {
      const [local, cloud] = await Promise.all([
        localEngine.getHealth(),
        cloudEngine.getHealth(),
      ]);
      setLocalHealth(local);
      setCloudHealth(cloud);
    } finally {
      setRefreshingHealth(false);
    }
  }, []);

  // Initial health checks for local and cloud engines
  useEffect(() => {
    runHealthCheck().catch(() => {});
  }, [runHealthCheck]);

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
            <>
              <EngineStatus
                engineMode={engineMode}
                localStatus={localHealth ?? undefined}
                cloudStatus={cloudHealth ?? undefined}
                localUrl={localUrl}
                cloudUrl={cloudUrl}
                onRefresh={runHealthCheck}
                refreshing={refreshingHealth}
              />
              <PromptForm
                onSubmit={handleGenerate}
                isLoading={isLoading}
                engineConfig={engineConfig}
                onConfigChange={setEngineConfig}
                engineMode={engineMode}
                onEngineModeChange={setEngineMode}
              />
            </>
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
