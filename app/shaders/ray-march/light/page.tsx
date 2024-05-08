import ShaderCavnas from "@/lib/components/ShaderCavnas";

import frag from "./this.frag";
import vert from "./this.vert";

export default async function Page() {
  const pixelDensity = 2;
  return <ShaderCavnas shader={{ vert, frag, pixelDensity }} />;
}
