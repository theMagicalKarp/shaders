"use client";

import React, { useEffect, useRef } from "react";
import type p5 from "p5";
import Stats from "stats.js";
import isMobile from "is-mobile";

export interface ImageSource {
  default: string;
  mobile?: string;
}

export interface ShaderTexture {
  src: ImageSource;
  uniform: string;
}

export interface Shader {
  vert: string;
  frag: string;
  pixelDensity: number;
  textures?: ShaderTexture[];
}

const sketch = (
  { vert, frag, pixelDensity, textures }: Shader,
  stats: Stats,
) => {
  const onMobile = isMobile();

  return (p: p5) => {
    let seconds = 0.0;
    let last = new Date().getTime();
    let delta = 0.0;
    const mouse: [number, number, number] = [
      p.windowWidth / 2,
      p.windowHeight / 2,
      1.2,
    ];
    const lastMouse: [number, number, number] = [0.0, 0.0, 1.2];
    let paused = false;
    let shader: p5.Shader;
    const loadedTextures: [string, p5.Image][] = [];

    p.preload = () => {
      shader = p.createShader(vert, frag);

      for (const { src, uniform } of textures || []) {
        const img = p.loadImage(
          onMobile && src.mobile ? src.mobile : src.default,
        );
        loadedTextures.push([uniform, img]);
      }
    };

    p.keyPressed = () => {
      if (p.keyCode === 32) {
        paused = !paused;
        if (!paused) {
          last = new Date().getTime();
        }
      }
    };

    p.touchStarted = () => {
      lastMouse[0] = p.mouseX;
      lastMouse[1] = p.mouseY;
    };

    p.mousePressed = () => {
      lastMouse[0] = p.mouseX;
      lastMouse[1] = p.mouseY;
    };

    p.mouseDragged = (e) => {
      mouse[0] += (lastMouse[0] - p.mouseX) * 1.2;
      mouse[1] += (lastMouse[1] - p.mouseY) * 1.2;
      lastMouse[0] = p.mouseX;
      lastMouse[1] = p.mouseY;
    };

    p.mouseWheel = (event: any) => {
      const delta = event?.delta || 0.0;
      mouse[2] += delta * 0.01;
      mouse[2] = Math.min(Math.max(mouse[2], 1.0), 6.0);
    };

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
      p.noStroke();
      p.pixelDensity(pixelDensity);
      p.frameRate(60);
      p.textureWrap(p.CLAMP, p.CLAMP);
    };

    p.draw = () => {
      stats.begin();
      p.shader(shader);
      for (const [unfiorm, image] of loadedTextures) {
        shader.setUniform(unfiorm, image);
      }
      shader.setUniform("resolution", [p.windowWidth, p.windowHeight]);
      shader.setUniform("uMouse", mouse);

      if (!paused) {
        const now = new Date().getTime();
        delta = now - last;
        seconds += delta * 0.001;
        last = now;
      }

      shader.setUniform("uSeconds", seconds);
      p.rect(0.0, 0.0, p.width, p.height);
      stats.end();
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);

      [mouse[0], mouse[1], mouse[2]] = [
        p.windowWidth / 2,
        p.windowHeight / 2,
        1.2,
      ];
      [lastMouse[0], lastMouse[1], lastMouse[2]] = [0.0, 0.0, 1.2];
    };
  };
};

interface Props {
  shader: Shader;
}

export default function ShaderCavnas({ shader }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    let instance: p5 | undefined;
    const setup = async () => {
      try {
        // p5 cannot be imported at the top level
        const p5 = (await import("p5")).default;
        instance = new p5(
          sketch(shader, stats),
          parentRef.current || undefined,
        );
      } catch (error) {
        console.log(error);
      }
    };

    const setupPromise = setup();

    const cleanup = async () => {
      await setupPromise;
      instance?.remove();
      stats?.dom.remove();
    };

    return () => {
      cleanup();
    };
  }, [shader]);

  return <div ref={parentRef}></div>;
}
