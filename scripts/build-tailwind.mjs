import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import fs from 'fs';

async function build() {
  try {
    const inputCss = `
@import "tailwindcss";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *, .dark, .dark *));
`;
    const result = await postcss([tailwind()]).process(inputCss, { from: 'src/app/globals.css' });
    fs.writeFileSync('src/app/tailwind-built.css', result.css);
    console.log("Tailwind compiled successfully! File size:", result.css.length);
  } catch (err) {
    console.error("Tailwind compile error:", err);
  }
}

build();
