"use client";

import React, { useRef, useMemo, MutableRefObject } from "react";

import Channel3D, { ChannelRender } from "@/lib/components/Channel3D";

import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Mesh, ShaderMaterial, TextureLoader, Texture } from "three";

import {
  Uniform,
  IsTextureUniform,
  IsGUIFloat,
  IsFBOUniform,
  FBOUniform3D,
} from "@/lib/uniforms";

import { zip } from "@/lib/utils";

import { useControls } from "leva";

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

interface FragmentProps {
  shader: Shader;
  uniforms: Uniform[];
}
const onMobile = isMobile();

const Fragment = ({ shader, uniforms }: FragmentProps) => {
  const { vertex, fragment } = shader;

  const mesh = useRef<Mesh>(null!);
  const material = useRef<ShaderMaterial>(null!);

  const guiFloatUniforms = useMemo(
    () => uniforms.filter(IsGUIFloat),
    [uniforms],
  );
  const controlOptions = useMemo(() => {
    return Object.fromEntries(
      guiFloatUniforms.map((u) => {
        return [
          u.uniform,
          { value: u.default, min: u.min, max: u.max, step: u.step },
        ];
      }),
    );
  }, [guiFloatUniforms]);

  const controls = useControls("hello world", controlOptions);
  const fboUniforms = useMemo(() => uniforms.filter(IsFBOUniform), [uniforms]);

  const fboRefs3D = fboUniforms.map(
    (uniform): [MutableRefObject<ChannelRender>, FBOUniform3D] => [
      useRef<ChannelRender>(null!), // eslint-disable-line  react-hooks/rules-of-hooks
      uniform,
    ],
  );

  const textureUniforms = useMemo(
    () => uniforms.filter(IsTextureUniform),
    [uniforms],
  );

  const loader = useLoader(
    TextureLoader,
    textureUniforms.map((u) => (onMobile ? u.src.mobile : u.src.default)),
  );

  const textures = useMemo(
    () =>
      zip(textureUniforms, loader).map(([uniform, texture]) => {
        texture.flipY = uniform.flipY;
        texture.wrapS = uniform.wrapS;
        texture.wrapT = uniform.wrapT;
        texture.minFilter = uniform.minFilter;
        texture.magFilter = uniform.magFilter;
        return texture;
      }),
    [loader, textureUniforms],
  );

  const shaderUniforms = useMemo(() => {
    type Entry = [string, { value: number | number[] | Texture }];

    const entries: Entry[] = [
      ["uSeconds", { value: 0.0 }],
      ["uResolution", { value: [0.0, 0.0] }],
      ["uFrame", { value: 0.0 }],
    ];

    const textureEntries: Entry[] = textureUniforms.map((u, i): Entry => {
      return [u.uniform, { value: textures[i] }];
    });

    const guiFloatEntries: Entry[] = guiFloatUniforms.map((u): Entry => {
      return [u.uniform, { value: u.default }];
    });

    const fboUniformEntries: Entry[] = fboUniforms.map((u): Entry => {
      return [u.uniform, { value: [] }];
    });

    return Object.fromEntries([
      ...entries,
      ...textureEntries,
      ...guiFloatEntries,
      ...fboUniformEntries,
    ]);
  }, [fboUniforms, textureUniforms, guiFloatUniforms, textures]);

  useFrame((state) => {
    const { gl, clock, size, camera, scene } = state;

    const { width, height } = size;

    for (const [ref, uniform] of fboRefs3D) {
      material.current.uniforms[uniform.uniform].value = ref.current.render(gl);
    }

    for (const [uniform, value] of Object.entries(controls)) {
      material.current.uniforms[uniform].value = value;
    }

    material.current.uniforms.uResolution.value[0] = width;
    material.current.uniforms.uResolution.value[1] = height;
    material.current.uniforms.uFrame.value += 1;
    material.current.uniforms.uSeconds.value = clock.getElapsedTime();

    gl.render(scene, camera);
  });

  return (
    <>
      {fboRefs3D.map(([ref, uniform]) => (
        <Channel3D
          key={uniform.uniform}
          shader={uniform.shader}
          size={uniform.size}
          ref={ref}
          wrapR={uniform.wrapR}
          wrapS={uniform.wrapS}
          wrapT={uniform.wrapT}
          magFilter={uniform.magFilter}
          minFilter={uniform.minFilter}
        />
      ))}

      <mesh ref={mesh} position={[0, 0, 0]}>
        <planeGeometry />
        <shaderMaterial
          ref={material}
          fragmentShader={fragment}
          vertexShader={vertex}
          uniforms={shaderUniforms}
        />
      </mesh>
    </>
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
