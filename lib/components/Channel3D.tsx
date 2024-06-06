"use client";

import React, {
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useState,
  ForwardedRef,
} from "react";

import { useFBO, OrthographicCamera } from "@react-three/drei";
import { createPortal } from "@react-three/fiber";
import {
  Scene,
  Data3DTexture,
  HalfFloatType,
  UnsignedByteType,
  RGBAFormat,
  ShaderMaterial,
  WebGLRenderer,
  Wrapping,
  MagnificationTextureFilter,
  MinificationTextureFilter,
} from "three";

interface Props {
  shader: {
    vertex: string;
    fragment: string;
  };
  size: [number, number, number];

  wrapS: Wrapping;
  wrapT: Wrapping;
  wrapR: Wrapping;
  magFilter: MagnificationTextureFilter;
  minFilter: MinificationTextureFilter;
}

export interface ChannelRender {
  render(gl: WebGLRenderer): Data3DTexture;
}

const Channel3D = forwardRef(function Channel(
  { shader, size, wrapS, wrapT, wrapR, magFilter, minFilter }: Props,
  ref: ForwardedRef<ChannelRender>,
) {
  const [texture, setTexture] = useState<Data3DTexture | undefined>(undefined);
  const [scene] = useState<Scene>(() => new Scene());
  const [width, height, depth] = size;

  const material = useRef<ShaderMaterial>(null!);
  const camera = useRef(null!);

  const { vertex, fragment } = shader;
  const fbo = useFBO(width, height, {
    format: RGBAFormat,
    type: UnsignedByteType,
  });

  const shaderUniforms = useMemo(() => {
    return {
      uResolution: { value: [width, height] },
      zLevel: { value: 0.0 },
    };
  }, [width, height]);

  const render = (gl: WebGLRenderer): Data3DTexture => {
    if (texture) {
      return texture;
    }

    const data = new Uint8Array(width * height * depth * 4);
    const pixelBuffer = new Uint8Array(width * height * 4);

    for (let i = 0; i < depth; i++) {
      material.current.uniforms.zLevel.value = i / 4.0;
      gl.setRenderTarget(fbo);
      gl.clear();
      gl.render(scene, camera.current);
      gl.readRenderTargetPixels(fbo, 0, 0, width, height, pixelBuffer);
      data.set(pixelBuffer, i * width * height * 4);
    }

    let newTexture = new Data3DTexture(data, width, height, depth);
    newTexture.format = RGBAFormat;
    newTexture.type = UnsignedByteType;

    newTexture.minFilter = minFilter;
    newTexture.magFilter = magFilter;
    newTexture.wrapS = wrapS;
    newTexture.wrapT = wrapT;
    newTexture.wrapR = wrapR;
    newTexture.needsUpdate = true;

    gl.setRenderTarget(null);

    setTexture(newTexture);

    return newTexture;
  };

  useImperativeHandle(ref, () => ({ render }));

  return createPortal(
    <mesh position={[0, 0, 0]}>
      <planeGeometry />
      <shaderMaterial
        ref={material}
        fragmentShader={fragment}
        vertexShader={vertex}
        uniforms={shaderUniforms}
      />
      <OrthographicCamera
        makeDefault
        position={[0, 0, 2]}
        args={[-1, 1, 1, -1, 1, 1000]}
        ref={camera}
      />
    </mesh>,
    scene,
  );
});

export default Channel3D;
