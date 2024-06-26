import ShaderCavnas, {
  Camera,
  Controls,
  Shader,
} from "@/lib/components/ShaderCavnas";

import { RepeatWrapping, NearestFilter } from "three";

import { Uniform } from "@/lib/uniforms";

import fragment from "./this.frag";
import vertex from "./this.vert";

export default async function Page() {
  const camera: Camera = {
    position: [0.0, 6.0, 12.0],
  };

  const controls: Controls = {
    maxDistance: 40.0,
    minDistance: 8.0,
  };

  const shader: Shader = { vertex, fragment };

  const uniforms: Uniform[] = [
    {
      type: "texture",
      src: {
        default: "/assets/skybox/watershed/default.jpg",
        mobile: "/assets/skybox/watershed/sm.jpg",
      },
      uniform: "uTexture",
      flipY: false,
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    },
  ];

  return (
    <ShaderCavnas
      shader={shader}
      controls={controls}
      camera={camera}
      uniforms={uniforms}
      dpr={4}
    />
  );
}
