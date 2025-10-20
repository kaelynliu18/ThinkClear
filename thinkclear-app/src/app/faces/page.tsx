"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import Cropper, { Area } from "react-easy-crop";

async function getCroppedBlob(imageSrc: string, pixelCrop: Area, mimeType: string): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported');
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const outputType = mimeType && mimeType.includes('png') ? 'image/png' : 'image/jpeg';

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create cropped image'));
      }
    }, outputType, 0.95);
  });
}

type Face = {
  relationship: string;
  images: string[];
};
type FacesData = Record<string, Face>;

interface ProgressResponse {
  entries?: Array<unknown>;
  accuracy?: Array<{ label: string }>;
  error?: string;
}

export default function FacesPage() {
  const { isSignedIn } = useAuth();
  const [faces, setFaces] = useState<FacesData>({});
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Processing your update...");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageForCropping, setImageForCropping] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const fetchFacesData = async (): Promise<FacesData> => {
    try {
      const res = await fetch("/api/faces", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        console.error("Failed to load faces:", json?.error);
        return {} as FacesData;
      }

      return (json ?? {}) as FacesData;
    } catch (err) {
      console.error("Failed to load faces", err);
      return {} as FacesData;
    }
  };

  const fetchProgressData = async (): Promise<ProgressResponse> => {
    try {
      const res = await fetch("/api/progress", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        console.warn("Failed to load progress during sync", json?.error);
        return { accuracy: [] };
      }
      return json as ProgressResponse;
    } catch (err) {
      console.warn("Progress sync fetch failed", err);
      return { accuracy: [] };
    }
  };

  const loadFaces = async () => {
    const data = await fetchFacesData();
    setFaces(data);
    setInitialLoading(false);
    return data;
  };


  const waitForFaceStatus = async (faceName: string, imageUrl: string, expectPresent: boolean) => {
    const target = faceName.trim().toLowerCase();
    const attempts = 20;
    for (let i = 0; i < attempts; i++) {
      const facesData = await fetchFacesData();
      if (Object.keys(facesData).length > 0) {
        setFaces(facesData);
      }
      const entry = facesData?.[faceName];
      const facePresent = !!entry && (!imageUrl || entry.images.includes(imageUrl));

      const progressData = await fetchProgressData();
      const labels = (progressData.accuracy ?? []).map((item) => item.label.trim().toLowerCase());
      const progressPresent = labels.includes(target);

      if ((expectPresent && facePresent && progressPresent) || (!expectPresent && !facePresent && !progressPresent)) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return false;
  };
  const refreshDependentData = async () => {
    try {
      await Promise.all([
        fetch("/api/faces", { cache: "no-store" }).catch(() => undefined),
        fetch("/api/progress", { cache: "no-store", credentials: "include" }).catch(() => undefined),
      ]);
    } catch (err) {
      console.warn("Failed to refresh related data", err);
    }
  };

  useEffect(() => {
    loadFaces();
  }, [showModal]);

  const openCropper = useCallback((fileToCrop: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImageForCropping(reader.result as string);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(fileToCrop);
  }, []);

  const handleFileSelection = (fileList: FileList | null) => {
    setError("");
    const picked = fileList?.[0];
    if (!picked) {
      setFile(null);
      setOriginalFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    setOriginalFile(picked);

    if (/heic|heif/i.test(picked.type) || /\.heic$/i.test(picked.name) || /\.heif$/i.test(picked.name)) {
      setFile(picked);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setImageForCropping(null);
      setCropModalOpen(false);
      const heicPreview = URL.createObjectURL(picked);
      setPreviewUrl(heicPreview);
      setError("Cropping is not available for HEIC images. We'll upload it as-is.");
      return;
    }

    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    openCropper(picked);
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setImageForCropping(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    if (!file) {
      setOriginalFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRecrop = () => {
    setError("");
    if (!originalFile) return;
    if (/heic|heif/i.test(originalFile.type) || /\.heic$/i.test(originalFile.name) || /\.heif$/i.test(originalFile.name)) {
      return;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    openCropper(originalFile);
  };

  const onCropComplete = useCallback((_: Area, croppedArea: Area) => {
    setCroppedAreaPixels(croppedArea);
  }, []);

  const handleCropConfirm = async () => {
    if (!imageForCropping || !croppedAreaPixels || !originalFile) {
      return;
    }

    try {
      setError("");
      const blob = await getCroppedBlob(imageForCropping, croppedAreaPixels, originalFile.type);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const extension = blob.type === 'image/png' ? 'png' : 'jpg';
      const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
      const croppedFile = new File([blob], `${baseName}-cropped.${extension}`, {
        type: blob.type,
      });
      setFile(croppedFile);
      const nextPreview = URL.createObjectURL(blob);
      setPreviewUrl(nextPreview);
      setCropModalOpen(false);
      setImageForCropping(null);
      setCroppedAreaPixels(null);
      setZoom(1);
    } catch (err) {
      console.error('Failed to crop image', err);
      setError('Unable to crop image. Please try a different photo.');
      setCropModalOpen(false);
      setImageForCropping(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Add a function to handle deleting a face
  const handleDelete = async (person: string, image: string) => {
    if (!confirm(`Delete ${person}?`)) return;

    setSyncMessage("Deleting face...");
    setSyncing(true);

    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: person, file: image }),
      });
      if (!res.ok) throw new Error("Failed to delete");

      setFaces((prev) => {
        const next = { ...prev };
        const entry = next[person];
        if (!entry) return next;

        const remaining = entry.images.filter((url) => url !== image);
        if (remaining.length === 0) {
          delete next[person];
        } else {
          next[person] = { ...entry, images: remaining };
        }
        return next;
      });

      const fullyCleared = await waitForFaceStatus(person, "", false);
      setSyncMessage(fullyCleared ? "Cleaning up..." : "Still removing… this may take a moment.");

      await refreshDependentData();
      await loadFaces();

      if (fullyCleared) {
        setTimeout(() => setSyncing(false), 500);
      } else {
        setSyncMessage("Still removing… this may take a moment.");
      }
    } catch (err) {
      console.error("Failed to delete face", err);
      setSyncMessage("Delete failed. Please refresh and try again.");
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !relationship.trim()) {
      setError("All fields are required.");
      return;
    }
    if (!file) {
      setError("Please select and crop a photo.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("relationship", relationship);
    formData.append("file", file, file.name);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      // success → close modal and reset
      setShowModal(false);
      setName("");
      setRelationship("");
      setFile(null);
      setOriginalFile(null);
      setImageForCropping(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSyncMessage("Processing your update...");
      setSyncing(true);

      const expectedName = (json.face?.name as string | undefined) ?? name;
      const expectedUrl = (json.face?.imageUrl as string | undefined) ?? "";

      if (json.face) {
        const uploadedFace = json.face as { name: string; relationship: string; imageUrl: string };
        setFaces((prev) => ({
          ...prev,
          [uploadedFace.name]: {
            relationship: uploadedFace.relationship,
            images: [uploadedFace.imageUrl, ...(prev[uploadedFace.name]?.images ?? [])],
          },
        }));
      }

      const fullySynced = await waitForFaceStatus(expectedName, expectedUrl, true);
      setSyncMessage(fullySynced ? "Wrapping up..." : "Still syncing… this may take a moment.");

      await refreshDependentData();
      await loadFaces();

      if (fullySynced) {
        setTimeout(() => setSyncing(false), 600);
      } else {
        setSyncMessage("Still syncing… this may take a moment.");
      }
    } catch (err: any) {
      setError(err.message);
      setSyncMessage("Something went wrong. Please try refreshing.");
      setTimeout(() => setSyncing(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 pb-12 bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0]">
      {cropModalOpen && imageForCropping && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold text-blue-700 mb-4">Adjust Crop</h3>
            <div className="relative w-full h-72 bg-black rounded-xl overflow-hidden">
              <Cropper
                image={imageForCropping}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-blue-600 mb-2">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCropCancel}
                className="px-4 py-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={!croppedAreaPixels}
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-pink-400 text-white rounded-full font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Use Photo
              </button>
            </div>
          </div>
        </div>
      )}
      {syncing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 text-center">
            <div className="animate-spin h-10 w-10 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-4"></div>
            <p className="text-blue-600 font-semibold">{syncMessage}</p>
            <p className="text-sm text-blue-400">This can take a few seconds.</p>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-4xl font-extrabold text-blue-700 drop-shadow-lg tracking-wide mb-4">Faces Gallery</h1>
        {isSignedIn ? (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-pink-400 text-white text-lg font-semibold rounded-full shadow-lg hover:from-blue-600 hover:to-pink-500 transition-transform transform hover:scale-105 mb-2"
          >
            + Add New Face
          </button>
        ) : (
          <p className="text-blue-500 text-sm">
            Sign in to add your own faces. Playing as a guest loads the ThinkClear founders by default.
          </p>
        )}
        </div>

        {/* Gallery grid */}
        {initialLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-700 font-semibold">Loading faces...</p>
          </div>
        ) : Object.keys(faces).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <p className="text-lg font-semibold mb-2">No faces yet.</p>
          <p className="text-base text-blue-500 mb-4">Click “Add New Face” to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {Object.entries(faces).map(([person, { relationship, images }]) => (
            <div key={person} className="bg-white border border-blue-100 rounded-2xl shadow-lg p-6 flex flex-col items-center relative transition-transform transform hover:scale-105 hover:shadow-2xl">
              {isSignedIn && (
                <button
                  className="absolute top-3 right-3 text-red-400 hover:text-red-600 bg-white/80 rounded-full p-1 shadow"
                  title="Delete face"
                  onClick={() => handleDelete(person, images[0])}
                >
                  <Trash2 size={20} />
                </button>
              )}
               <img
                 src={images[0].startsWith('http') ? images[0] : `/${images[0]}`}
                 alt={person}
                 className="w-32 h-32 object-cover rounded-full border-4 border-blue-200 shadow mb-4"
               />
              <h2 className="mt-2 font-bold text-lg text-blue-700">{person}</h2>
              <p className="text-sm text-blue-500">{relationship}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isSignedIn && showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 text-2xl font-bold"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">Add a New Face</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-blue-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block font-semibold text-blue-700 mb-1">Relationship</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full border border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block font-semibold text-blue-700 mb-1">Photo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={(e) => handleFileSelection(e.target.files)}
                  className="w-full border border-blue-200 rounded px-3 py-2"
                />
                <small className="text-xs text-gray-500">
                  HEIC, JPEG, PNG—anything will be converted to JPEG.
                </small>
                {previewUrl && (
                  <div className="mt-4">
                    <img
                      src={previewUrl}
                      alt="Cropped preview"
                      className="w-32 h-32 object-cover rounded-full border-2 border-blue-200 shadow"
                    />
                  </div>
                )}
                {file &&
                  originalFile &&
                  !(/heic|heif/i.test(originalFile.type) || /\.heic$/i.test(originalFile.name) || /\.heif$/i.test(originalFile.name)) && (
                  <button
                    type="button"
                    onClick={handleRecrop}
                    className="mt-3 px-4 py-2 border border-blue-300 rounded-full text-blue-600 hover:bg-blue-50 transition"
                  >
                    Adjust Crop
                  </button>
                )}
              </div>

              {error && <p className="text-red-600 text-center">{error}</p>}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-blue-300 rounded-full text-blue-600 hover:bg-blue-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || cropModalOpen || !file}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
