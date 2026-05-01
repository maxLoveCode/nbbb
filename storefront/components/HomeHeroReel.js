"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function HomeHeroReel({ slides = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef([]);
  const videoRefs = useRef([]);

  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const nextIndex = Number(visible.target.dataset.index || 0);
        setActiveIndex(nextIndex);
      },
      {
        threshold: [0.55, 0.75]
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [slides.length]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === activeIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex]);

  const scrollToSlide = (index) => {
    sectionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };

  return (
    <div className="hero-reel-page">
      <div className="hero-reel-track">
        {slides.map((slide, index) => (
          <section
            key={slide.id || index}
            ref={(node) => {
              sectionRefs.current[index] = node;
            }}
            data-index={index}
            className={`hero-reel-slide ${index === activeIndex ? "is-active" : ""}`}
          >
            <div className="hero-reel-media">
              {slide.video ? (
                <video
                  ref={(node) => {
                    videoRefs.current[index] = node;
                  }}
                  className="hero-reel-video"
                  src={slide.video}
                  poster={slide.image || undefined}
                  muted
                  loop
                  playsInline
                  preload={index === 0 ? "auto" : "metadata"}
                  autoPlay={index === 0}
                />
              ) : slide.image ? (
                <img className="hero-reel-image" src={slide.image} alt={slide.title || `Slide ${index + 1}`} />
              ) : (
                <div className="hero-reel-fallback" />
              )}
            </div>

            <div className="hero-reel-overlay" />

            <div className="hero-reel-content">
              <div className="hero-reel-copy">
                <p className="hero-reel-minimal-line">{slide.brand_name || "NBBB Atelier"}</p>
                <Link href={slide.href || "/collections"} className="hero-reel-text-link">
                  View collection
                </Link>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="hero-reel-dots" aria-label="Slide navigation">
        {slides.map((slide, index) => (
          <button
            key={slide.id || index}
            type="button"
            className={`hero-reel-dot ${index === activeIndex ? "is-active" : ""}`}
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => scrollToSlide(index)}
          >
            <span />
          </button>
        ))}
      </div>
    </div>
  );
}
