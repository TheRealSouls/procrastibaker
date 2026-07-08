# Assets Guide

Reuse assets from the web app where possible.

Android starter asset folder:

```txt
assets/
  sprites/
    cookie.png
    brownie.png
    muffin.png
    cake.png
    house.png
    clock.png
    shopping_cart.png
    bar_chart.png
    icon.png
  images/
    bakery.jpg
  sounds/
    oven-loop.mp3
```

Included assets:
- cookie.png: pastry sprite
- brownie.png: pastry sprite
- muffin.png: pastry sprite
- cake.png: pastry sprite for Birthday Cake / cake
- house.png: dashboard icon
- clock.png: timer icon
- shopping_cart.png: shop icon
- bar_chart.png: stats icon
- icon.png: croissant brand icon
- bakery.jpg: landing / welcome image
- oven-loop.mp3: optional active-session oven ambience

Asset usage:
- Use pastry sprites instead of emoji where possible.
- Keep emoji or text fallback in data where useful.
- Use bakery.jpg for welcome or landing visuals.
- Use oven-loop.mp3 through expo-av.
- Keep audio optional and disabled gracefully if loading fails.
- Do not add cursor assets to Android. They are web-only.

Pixel sprite guidance:
- Use nearest-neighbor style scaling where available.
- Avoid stretching sprites non-proportionally.
- Prefer fixed square frames for pastry sprites.
- Keep sprites visually crisp at common Android screen densities.

Expo guidance:
- Import static images with require or typed asset maps.
- Keep asset paths stable.
- Do not hardcode absolute Windows paths.
- Keep audio files in assets/sounds and load them through expo-av.

Suggested pastry asset map:

```ts
export const pastrySprites = {
  cookie: require("../assets/sprites/cookie.png"),
  brownie: require("../assets/sprites/brownie.png"),
  muffin: require("../assets/sprites/muffin.png"),
  cake: require("../assets/sprites/cake.png"),
};
```
