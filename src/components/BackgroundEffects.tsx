'use client'

import React from 'react'

export function BackgroundEffects() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
        {/* Animated wallpaper layer */}
        <div className="wallpaper-drift-container absolute inset-[-15%] opacity-60 mix-blend-screen dark:opacity-60">
          <div className="bg-gradient-radial-1 absolute inset-0" />
          <div className="bg-gradient-radial-2 absolute inset-0" />
        </div>
      </div>
      <style jsx>{`
        .wallpaper-drift-container {
          background:
            radial-gradient(
              ellipse 900px 600px at 12% 0%,
              rgba(20, 184, 166, 0.3) 0%,
              transparent 58%
            ),
            radial-gradient(
              ellipse 750px 500px at 90% 5%,
              rgba(56, 189, 248, 0.24) 0%,
              transparent 56%
            ),
            radial-gradient(
              ellipse 1000px 600px at 50% 112%,
              rgba(245, 158, 11, 0.2) 0%,
              transparent 62%
            ),
            radial-gradient(
              ellipse 650px 450px at 3% 62%,
              rgba(16, 185, 129, 0.16) 0%,
              transparent 54%
            ),
            radial-gradient(
              ellipse 700px 500px at 96% 78%,
              rgba(99, 102, 241, 0.13) 0%,
              transparent 55%
            ),
            radial-gradient(
              ellipse 120% 80% at 50% 50%,
              rgba(20, 184, 166, 0.04) 0%,
              transparent 70%
            );
          animation: wallpaper-drift 30s ease-in-out infinite;
          will-change: transform;
          backface-visibility: hidden;
          perspective: 1000px;
        }

        .light .wallpaper-drift-container {
          background:
            radial-gradient(
              ellipse 1200px 650px at 10% -5%,
              rgba(20, 184, 166, 0.26) 0%,
              transparent 58%
            ),
            radial-gradient(
              ellipse 950px 560px at 92% 2%,
              rgba(56, 189, 248, 0.22) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse 1100px 580px at 50% 112%,
              rgba(245, 158, 11, 0.18) 0%,
              transparent 65%
            ),
            radial-gradient(
              ellipse 750px 520px at 2% 62%,
              rgba(16, 185, 129, 0.16) 0%,
              transparent 56%
            ),
            radial-gradient(
              ellipse 680px 480px at 96% 75%,
              rgba(99, 102, 241, 0.14) 0%,
              transparent 55%
            ),
            radial-gradient(
              ellipse 120% 80% at 50% 50%,
              rgba(20, 184, 166, 0.05) 0%,
              transparent 70%
            );
        }

        .violet .wallpaper-drift-container {
          background:
            radial-gradient(
              ellipse 950px 650px at 10% 0%,
              rgba(139, 92, 246, 0.36) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse 800px 560px at 90% 5%,
              rgba(236, 72, 153, 0.28) 0%,
              transparent 58%
            ),
            radial-gradient(
              ellipse 950px 580px at 50% 112%,
              rgba(168, 85, 247, 0.24) 0%,
              transparent 62%
            ),
            radial-gradient(
              ellipse 600px 450px at 2% 65%,
              rgba(99, 102, 241, 0.18) 0%,
              transparent 54%
            ),
            radial-gradient(
              ellipse 650px 480px at 95% 80%,
              rgba(244, 114, 182, 0.16) 0%,
              transparent 55%
            );
        }

        @keyframes wallpaper-drift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          25% {
            transform: translate3d(2%, -1.5%, 0) scale(1.02);
          }
          50% {
            transform: translate3d(1%, 2%, 0) scale(1.015);
          }
          75% {
            transform: translate3d(-1.5%, 0.5%, 0) scale(1.025);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wallpaper-drift-container {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  )
}
