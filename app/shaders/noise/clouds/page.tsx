import ShaderCavnas, {
  Camera,
  Controls,
  Shader,
} from "@/lib/components/ShaderCavnas";

import { RepeatWrapping, NearestFilter, LinearFilter } from "three";

import { Uniform } from "@/lib/uniforms";

import fragment from "./this.frag";
import vertex from "./this.vert";
import PerlinWorley from "./perlin-worley.frag";

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
        default: "/noise/blue.png",
        mobile: "/noise/blue.png",
      },
      uniform: "blueNoise",
      flipY: false,
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    },
    {
      type: "fbo-3d",
      uniform: "uChannelA",
      shader: { vertex, fragment: PerlinWorley },
      size: [32, 32, 64],
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      wrapR: RepeatWrapping,
    },
  ];

  return (
    <ShaderCavnas
      shader={shader}
      controls={controls}
      camera={camera}
      uniforms={uniforms}
      dpr={1}
    />
  );
}
