"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile && selectedFile.name.toLowerCase().endsWith(".heic")) {
      alert("HEIC files are not supported. Please upload a JPG or PNG.");
      setFile(null);
    } else {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !relationship || !file) {
      alert("Please fill out all fields.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("relationship", relationship);
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("Person added successfully!");
      router.push("/faces");
    } else {
      alert("Failed to add person.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#B6D0E2] to-[#FDECEC] p-6">
      <h1 className="text-2xl font-bold text-center mb-4 text-[#0033cc]">Add New Person</h1>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4 bg-white p-6 rounded-lg shadow-lg">
        <div>
          <label className="block font-medium mb-1 text-black">Full Name:</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-black"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1 text-black">Relationship:</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded text-black"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1 text-black">Upload Image:</label>
          <input
            type="file"
            accept="image/*"
            className="w-full text-black"
            onChange={handleFileChange}
            required
          />
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Save Person
        </button>
      </form>
    </main>
  );
}
