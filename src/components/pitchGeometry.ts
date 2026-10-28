// Event coordinates are 0-100 on both axes; the drawing keeps a real pitch ratio.
export const PITCH_W = 106;
export const PITCH_H = 70;
export const X0 = 3, Y0 = 3, W = 100, H = 64;
export const px = (x: number) => X0 + (x / 100) * W;
export const py = (y: number) => Y0 + (y / 100) * H;
