"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { Trash2 } from "lucide-react";

type Face = {
  relationship: string;
  images: string[];
};
type FacesData = Record<string, Face>;

export default function FacesPage() {
  const [faces, setFaces] = useState<FacesData>({});
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFaces = async () => {
    try {
      const res = await fetch("/api/faces", {
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok) {
        console.error("Failed to load faces:", json?.error);
        setFaces({});
        return;
      }

      setFaces(json ?? {});
    } catch (err) {
      console.error("Failed to load faces", err);
      setFaces({});
    }
  };

  useEffect(() => {
    loadFaces();
  }, [showModal]);

  // Add a function to handle deleting a face
  const handleDelete = async (person: string, image: string) => {
    if (!confirm(`Delete ${person}?`)) return;
    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: person, file: image }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      // Remove from UI
      setFaces((prev) => {
        const updated = { ...prev };
        if (updated[person]) {
          updated[person].images = updated[person].images.filter((img) => img !== image);
          if (updated[person].images.length === 0) delete updated[person];
        }
        return { ...updated };
      });
    } catch (err) {
      alert("Could not delete face.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !relationship.trim() || !file) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("relationship", relationship);
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      // success → close modal and reset
      setShowModal(false);
      setName("");
      setRelationship("");
      setFile(null);
      fileInputRef.current!.value = "";
      await loadFaces();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6 pb-12 bg-gradient-to-b from-[#e2f0ff] to-[#ffe5f0]">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-4xl font-extrabold text-blue-700 drop-shadow-lg tracking-wide mb-4">Faces Gallery</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-pink-400 text-white text-lg font-semibold rounded-full shadow-lg hover:from-blue-600 hover:to-pink-500 transition-transform transform hover:scale-105 mb-2"
        >
          + Add New Face
        </button>
      </div>

      {/* Gallery grid */}
      {Object.keys(faces).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <p className="text-lg font-semibold mb-2">No faces yet.</p>
          <p className="text-base text-blue-500 mb-4">Click “Add New Face” to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {Object.entries(faces).map(([person, { relationship, images }]) => (
            <div key={person} className="bg-white border border-blue-100 rounded-2xl shadow-lg p-6 flex flex-col items-center relative transition-transform transform hover:scale-105 hover:shadow-2xl">
              <button
                className="absolute top-3 right-3 text-red-400 hover:text-red-600 bg-white/80 rounded-full p-1 shadow"
                title="Delete face"
                onClick={() => handleDelete(person, images[0])}
              >
                <Trash2 size={20} />
              </button>
              <img
                src={`/api/face-image?path=${encodeURIComponent(images[0])}`}
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
      {showModal && (
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
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full border border-blue-200 rounded px-3 py-2"
                />
                <small className="text-xs text-gray-500">
                  HEIC, JPEG, PNG—anything will be converted to JPEG.
                </small>
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
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition"
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
