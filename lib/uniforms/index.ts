import type {
  Wrapping,
  MagnificationTextureFilter,
  MinificationTextureFilter,
} from "three";

export interface TextureUniform {
  type: "texture";
  src: {
    default: string;
    mobile: string;
  };

  wrapS: Wrapping;
  wrapT: Wrapping;
  magFilter: MagnificationTextureFilter;
  minFilter: MinificationTextureFilter;
  flipY: boolean;
  uniform: string;
}

export const IsTextureUniform = (u: any): u is TextureUniform =>
  u.type === "texture";

export interface GUIFloat {
  type: "gui-float";
  default: number;
  min: number;
  max: number;
  step: number;
  uniform: string;
}

export const IsGUIFloat = (u: any): u is GUIFloat => u.type === "gui-float";

export interface FBOUniform3D {
  type: "fbo-3d";
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

  uniform: string;
}

export const IsFBOUniform = (u: any): u is FBOUniform3D => u.type === "fbo-3d";

export type Uniform = TextureUniform | GUIFloat | FBOUniform3D;
