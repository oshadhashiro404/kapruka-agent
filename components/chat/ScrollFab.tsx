"use client";

interface ScrollFabProps {
  visible: boolean;
  onClick: () => void;
}

export default function ScrollFab({ visible, onClick }: ScrollFabProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to bottom"
      className="fixed bottom-28 right-6 z-20 w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center animate-fade-in-up hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    </button>
  );
}
