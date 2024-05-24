"use client";

import React, { useRef, useMemo } from "react";

import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  Mesh,
  ShaderMaterial,
  TextureLoader,
  RepeatWrapping,
  NearestFilter,
} from "three";

import isMobile from "is-mobile";

export interface Shader {
  vertex: string;
  fragment: string;
}

export interface Camera {
  position: [number, number, number];
}

export interface Controls {
  maxDistance: number;
  minDistance: number;
}

export interface TextureUniform {
  type: "texture";
  src: {
    default: string;
    mobile: string;
  };
  uniform: string;
}

const IsTextureUniform = (u: any): u is TextureUniform => u.type === "texture";

export type Uniform = TextureUniform;

interface FragmentProps {
  shader: Shader;
  uniforms: Uniform[];
}

const Fragment = ({ shader, uniforms }: FragmentProps) => {
  const onMobile = isMobile();

  const mesh = useRef<Mesh>(null!);
  const material = useRef<ShaderMaterial>(null!);

  const { vertex, fragment } = shader;
  const textureUniforms = uniforms.filter(IsTextureUniform);

  const textures = useLoader(
    TextureLoader,
    textureUniforms.map((u) => (onMobile ? u.src.mobile : u.src.default)),
  );

  for (const texture of textures) {
    texture.flipY = false;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.minFilter = NearestFilter;
  }

  const shaderUniforms = useMemo(() => {
    type Entry = [string, { value: any }];

    const entries: Entry[] = [
      ["uSeconds", { value: 0.0 }],
      ["uResolution", { value: [0.0, 0.0] }],
    ];

    const textureEntries: Entry[] = textureUniforms.map((u, i): Entry => {
      return [u.uniform, { value: textures[i] }];
    });

    return Object.fromEntries(entries.concat(textureEntries));
  }, [textures, textureUniforms]);

  useFrame((state) => {
    const { clock, size } = state;
    const { width, height } = size;

    material.current.uniforms.uResolution.value[0] = width;
    material.current.uniforms.uResolution.value[1] = height;
    material.current.uniforms.uSeconds.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={mesh} position={[0, 0, 0]}>
      <planeGeometry />
      <shaderMaterial
        ref={material}
        fragmentShader={fragment}
        vertexShader={vertex}
        uniforms={shaderUniforms}
      />
    </mesh>
  );
};

interface Props {
  shader: Shader;
  camera: Camera;
  dpr: number;
  controls: Controls;
  uniforms: Uniform[];
}

export default function ShaderCavnas({
  shader,
  camera,
  dpr,
  controls,
  uniforms,
}: Props) {
  return (
    <Canvas flat linear camera={camera} dpr={dpr}>
      <Stats />
      <Fragment shader={shader} uniforms={uniforms} />
      <OrbitControls
        maxDistance={controls.maxDistance}
        minDistance={controls.minDistance}
      />
    </Canvas>
  );
}
