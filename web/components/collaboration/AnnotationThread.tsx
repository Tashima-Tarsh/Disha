"use client";

interface AnnotationThreadProps {
  messageId: string;
  onClose: () => void;
}

export function AnnotationThread({ messageId, onClose }: AnnotationThreadProps) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-lg p-3 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-surface-300">Annotations</span>
        <button
          onClick={onClose}
          className="text-surface-400 hover:text-surface-200 text-xs"
        >
          ✕
        </button>
      </div>
      <p className="text-xs text-surface-400">No annotations yet</p>
    </div>
  );
}
