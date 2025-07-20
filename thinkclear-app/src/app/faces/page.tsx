"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

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

  // fetch gallery on mount or when showModal closes
  useEffect(() => {
    fetch("/api/faces")
      .then((res) => res.json())
      .then(setFaces)
      .catch(console.error);
  }, [showModal]);

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
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      // success → close modal and reset
      setShowModal(false);
      setName("");
      setRelationship("");
      setFile(null);
      fileInputRef.current!.value = "";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (person: string) => {
    if (!window.confirm(`Remove ${person} from gallery?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/faces/${encodeURIComponent(person)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove face");
      setFaces((prev) => {
        const updated = { ...prev };
        delete updated[person];
        return updated;
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 pb-12 bg-gray-50">
      <h1 className="text-3xl mb-6 text-blue-700">Faces Gallery</h1>

      {/* Gallery grid */}
      {Object.keys(faces).length === 0 ? (
        <p className="text-gray-600">
          No faces yet. Click “Add New Face” to get started.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(faces).map(([person, { relationship, images }]) => (
            <div key={person} className="bg-white rounded-lg shadow p-6">
              <img
                src={`/faces-data/${images[0]}`}
                alt={person}
                className="w-full h-48 object-cover rounded"
              />
              <h2 className="mt-4 font-semibold text-lg">{person}</h2>
              <p className="text-sm text-gray-500">{relationship}</p>
              <button
                onClick={() => handleRemove(person)}
                className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={loading}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Face button */}
      <button
        onClick={() => setShowModal(true)}
        className="mt-8 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Add New Face
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl mb-4 text-blue-700">Add a New Face</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block">Relationship</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block">Photo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full"
                />
                <small className="text-xs text-gray-500">
                  HEIC, JPEG, PNG—anything will be converted to JPEG.
                </small>
              </div>

              {error && <p className="text-red-600">{error}</p>}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
