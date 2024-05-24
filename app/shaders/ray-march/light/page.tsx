import ShaderCavnas, {
  Camera,
  Controls,
  Shader,
  Uniform,
} from "@/lib/components/ShaderCavnas";

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

  const uniforms: Uniform[] = [];

  return (
    <ShaderCavnas
      shader={shader}
      uniforms={uniforms}
      controls={controls}
      camera={camera}
      dpr={1}
    />
  );
}
