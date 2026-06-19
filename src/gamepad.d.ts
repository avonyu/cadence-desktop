declare module "gamepad.js" {
  interface GamepadEventDetail {
    index: number;
    button: number;
    value: number;
    pressed: boolean;
    label?: string;
    gamepad: Gamepad;
  }

  interface GamepadAxisDetail {
    index: number;
    axis: number;
    value: number;
    gamepad: Gamepad;
  }

  interface GamepadConnectionDetail {
    index: number;
    gamepad: Gamepad;
  }

  interface GamepadListenerOptions {
    analog?: boolean;
    precision?: number;
    deadZone?: number;
    button?: { analog?: boolean };
    axis?: { precision?: number; deadZone?: number };
  }

  class Mapping {
    static detect(gamepad: Gamepad): boolean;
    static getLabel(type: string, index: number): string;
  }

  class XBoxMapping extends Mapping {}

  class Zero2Mapping extends Mapping {}

  class GamepadListener {
    constructor(options?: GamepadListenerOptions, mappings?: Mapping[]);
    on(
      event: "gamepad:button",
      callback: (e: { detail: GamepadEventDetail }) => void
    ): void;
    on(
      event: "gamepad:axis",
      callback: (e: { detail: GamepadAxisDetail }) => void
    ): void;
    on(
      event: "gamepad:connected" | "gamepad:disconnected",
      callback: (e: { detail: GamepadConnectionDetail }) => void
    ): void;
    off(
      event: string,
      callback: (e: { detail: unknown }) => void
    ): void;
    start(): void;
    stop(): void;
  }
}
