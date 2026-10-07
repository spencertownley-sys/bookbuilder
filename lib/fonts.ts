// Kid-friendly, free (OFL) Google Fonts — all are safe for commercial print.
export const FONTS = [
  { family: "Fredoka", label: "Fredoka (round & bubbly)" },
  { family: "Baloo 2", label: "Baloo (friendly)" },
  { family: "Patrick Hand", label: "Patrick Hand (handwritten)" },
  { family: "Comic Neue", label: "Comic Neue (classic)" },
  { family: "Chewy", label: "Chewy (cartoon title)" },
  { family: "Quicksand", label: "Quicksand (clean)" },
  { family: "Andika", label: "Andika (early readers)" },
  { family: "Lora", label: "Lora (storybook serif)" },
  { family: "Gaegu", label: "Gaegu (crayon)" },
  { family: "Atkinson Hyperlegible", label: "Atkinson (dyslexia-friendly)" },
] as const;

export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "Fredoka:wght@400;600",
    "Baloo+2:wght@400;700",
    "Patrick+Hand",
    "Comic+Neue:wght@400;700",
    "Chewy",
    "Quicksand:wght@400;700",
    "Andika:wght@400;700",
    "Lora:wght@400;700",
    "Gaegu:wght@400;700",
    "Atkinson+Hyperlegible:wght@400;700",
  ]
    .map((f) => "family=" + f)
    .join("&") +
  "&display=swap";
