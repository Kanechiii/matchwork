import type { PitchFrame } from "./playerMovement";
import type { RosterEntry } from "../format";
export interface SceneRenderer {
  render(frame: PitchFrame, active: string | null): void;
  setView(view: "broadcast" | "overhead", zoom: number): void;
  project(id: string): {x:number;y:number} | null;
  dispose(): void;
}
export function createRenderer(host: HTMLElement, roster: Map<string,RosterEntry>, onHover:(id:string|null)=>void,onSelect:(id:string|null)=>void,onFailure:()=>void): SceneRenderer;
