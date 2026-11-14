// Farm returns static image data only for raster formats; an SVG import is the
// asset URL Vite emits.
declare module "*.svg" {
  const src: string;
  export default src;
}
