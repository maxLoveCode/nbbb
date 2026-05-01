"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export function HomeHeroReel({ slides = [], categories = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef([]);
  const videoRefs = useRef([]);

  const quickCategories = useMemo(() => categories.slice(0, 5), [categories]);

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
                <div className="hero-reel-topline">
                  <span>{slide.brand_name || "NBBB Atelier"}</span>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h1>{slide.title || "NBBB Atelier"}</h1>
                <p>{slide.subtitle || "新季系列以全屏影像叙事，带来更沉浸的品牌首页体验。"}</p>
                <div className="hero-reel-actions">
                  <Link href={slide.href || "/collections"} className="button-primary">
                    {slide.button_text || "进入系列"}
                  </Link>
                </div>
              </div>

              <div className="hero-reel-side">
                <div className="hero-reel-side-card">
                  <span className="eyebrow">Series note</span>
                  <strong>{slide.sideTitle || "Moving editorial frame"}</strong>
                  <p>{slide.sideDescription || "用翻页节奏把品牌故事、视频和系列入口串成连续体验。"}</p>
                </div>

                <div className="hero-reel-category-row">
                  {quickCategories.map((category) => (
                    <Link key={category.slug} href={`/collections/${category.slug}`} className="hero-reel-chip">
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="hero-reel-bottom-bar">
              <span className="hero-reel-scroll-hint">向上滑动继续浏览</span>
              <div className="hero-reel-progress">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>/</span>
                <span>{String(slides.length).padStart(2, "0")}</span>
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
