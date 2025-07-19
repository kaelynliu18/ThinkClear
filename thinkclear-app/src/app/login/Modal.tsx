'use client';
import React from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        {children}
        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
