"use client";

import { Toaster } from "@/components/ui/sonner";

export default function ToasterClient() {
  return (
    <>
      <style>{`
        [data-sonner-toast] {
          position: relative !important;
        }

        [data-sonner-toast] [data-close-button] {
          position: absolute !important;
          top: 50% !important;
          right: 12px !important;
          left: auto !important;
          transform: translateY(-50%) !important;
          width: auto !important;
          height: auto !important;
          padding: 2px 8px !important;
          border-radius: 4px !important;
          background: #f3f4f6 !important;
          border: 1px solid #e5e7eb !important;
          color: #374151 !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
        }

        [data-sonner-toast] [data-close-button] svg {
          display: none !important;
        }

        [data-sonner-toast] [data-close-button]::after {
          content: "Clear" !important;
        }
      `}</style>

      <Toaster
        position="top-right"
        closeButton
        icons={{
          success: null,
          error: null,
          warning: null,
          info: null,
          loading: null,
        }}
      />
    </>
  );
}