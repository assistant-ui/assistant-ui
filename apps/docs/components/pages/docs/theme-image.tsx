type ThemeImageProps = {
  light: string;
  dark: string;
  alt: string;
  width: number;
  height: number;
};

// Both variants are lazy: browsers never fetch a lazy image hidden with
// display:none, so only the active theme's file downloads.
export function ThemeImage({
  light,
  dark,
  alt,
  width,
  height,
}: ThemeImageProps) {
  return (
    <>
      <img
        src={light}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className="rounded-lg dark:hidden"
      />
      <img
        src={dark}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className="hidden rounded-lg dark:block"
      />
    </>
  );
}

export function ThemeImageLLM({ light, alt }: ThemeImageProps) {
  return <img src={light} alt={alt} />;
}
