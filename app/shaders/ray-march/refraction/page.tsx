import ShaderCavnas, { ShaderTexture } from "@/lib/components/ShaderCavnas";

import frag from "./this.frag";
import vert from "./this.vert";

export default async function Page() {
  const pixelDensity = 4;
  const textures: ShaderTexture[] = [
    {
      src: {
        default: "/assets/skybox/watershed/default.jpg",
        mobile: "/assets/skybox/watershed/sm.jpg",
      },
      uniform: "uTexture",
    },
  ];

  return <ShaderCavnas shader={{ vert, frag, pixelDensity, textures }} />;
}
