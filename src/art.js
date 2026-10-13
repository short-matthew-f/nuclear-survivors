// CSS custom properties can resolve relative URLs against the consuming stylesheet.
// Use document-relative absolute URLs for both CSS artwork and Canvas images.
export function artUrl(file, base, documentUrl) {
  return new URL(`${base}art/${file}`, documentUrl).href;
}
