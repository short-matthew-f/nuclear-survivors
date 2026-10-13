# Original game artwork

Generated with the built-in imagegen tool for this project. These files are bundled locally and precached for offline play. No external runtime image service is used.

- `key-art.png`: portrait menu illustration.
- `characters.png`: 4 × 3 transparent atlas. Operators 0–2; walker 3; runner 4; brute 5; spitter 6; charger 7; splitter 8; titans 9–11. Cells are sampled at runtime from the original dimensions.
- `terrain.png`: 3 × 1 ground atlas: forest, marsh, industrial. Prepared as Canvas patterns at load.
- `props.png`: 4 × 2 transparent environmental prop atlas.

The transparent sprites are single painted poses, with movement and combat effects animated by Canvas. The ground textures repeat; seams may remain visible in the generated source.

## Final prompts

### art

Use case: stylized-concept. Asset type: original portrait key art for a mobile survival game titled Nuclear Survivors, with no lettering. Scene: abandoned nuclear power station in a radioactive wasteland at dusk, damaged cooling towers, tangled pipes, glowing green fissures and distant mutant silhouettes. Subject: a lone survivor seen from behind wearing a weathered mustard-yellow hazmat jacket, dark respirator, small backpack and carrying a salvaged sci-fi rifle, standing in the lower middle foreground. Style: premium hand-painted game illustration, bold ink silhouettes, textured brushwork, dramatic readable shapes, olive charcoal, muted rust and acid green highlights. Composition: portrait 2:3, dramatic towers in upper half, survivor in lower half, dark quiet upper-left space suitable for overlaid interface typography. Constraints: no text, no logos, no watermark, no UI, no photorealism; atmospheric but crisp, no foggy white haze at top. Intended as menu background.

### sprite

Use case: stylized-concept. Asset type: top-down mobile roguelite game sprite atlas. Create exactly a 4-column by 3-row regular grid of twelve separate centered character sprites, each entirely inside its equal sized cell with generous transparent padding, on a genuinely transparent background. Orthographic view looking straight down, each character facing right, hand-painted detailed pixel-inspired ink illustration with thick charcoal outlines, muted olive/rust/acid green nuclear wasteland palette, crisp readable silhouettes. Row 1 from left: yellow hazmat survivor with respirator backpack and rifle; cyan-armored female electrical engineer with coil backpack; heavy rust-colored armored guardian carrying rotary saw; green infected humanoid in ragged civilian clothes. Row 2: lean feral mutant dog with tawny fur; huge bulky mutant with cracked concrete armor; green spore mutant with bulging mushroom sacs; red long-limbed charging mutant with claws. Row 3: purple bloated brood creature; enormous tree-root and bone titan with glowing amber eyes; massive mushroom queen with green luminous cap; armored reactor-core titan with orange glowing furnace chest. Constraints: twelve sprites only, no scenery, no shadows beyond character silhouette, no text, no labels, no borders or grid lines, no weapons detached from characters. All face right and are top-down, equal centered cells; no overlap between cells.

### terrain

Use case: stylized-concept. Asset type: top-down ground texture atlas for Nuclear Survivors mobile survival game. Exactly three equal square panels side by side in one horizontal image. Left panel: dark olive forest dirt with tiny dry leaf fragments and subtle moss. Middle panel: deep teal muddy marsh ground, small shallow puddles and reeds. Right panel: dark charcoal rust industrial concrete floor with fine cracks and worn metal seams. Orthographic straight-down, hand-painted gritty game environment, restrained low contrast and detail so small character sprites and projectiles remain clear over it. Each panel must tile seamlessly with itself on all four sides. Flat lighting, no large objects, no trees or characters, no dramatic shadows, no labels, no border between panels, no UI, no text. Palette predominantly dark desaturated green/teal/brown, no bright highlights.

### props

undefined
