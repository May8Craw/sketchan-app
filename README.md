## Project name ##

Sketchan 

(Sketch and Animate -> Sketch An -> Sketchan)

## Intended Audience ##

The intended audience for Sketchan are digital artists and animators who want to quickly iterate on an animatic idea or experiment with color and composition. Users are able to visit Sketchan to test animations in a simple and compact 2D space.

## Problem/Opportunity ##

When I was creating Sketchan, I had these two major problems in mind: 

- A lot of animation applications can feel very overwhelming and confusing to beginners. Using Sketchan, I wanted to give beginners an opportunity to create short GIFs and animations without having to parse through an expansive interface. With Sketchan, it is simply the user and the canvas with straightforward tools.

- As an artist, I know what it is like to have a sudden idea that I would like to test (at work or hanging out with friends, for instance) before I forget it. However, in these moments I often do not have my digital art tools with me; even when I do, opening a heavy animation software can just be unnecessary for quick ideas. Sketchan was created so that anyone can test and save a simple composition or animation idea.

## Primary User Flow ##

Sketchan has one primary screen with curated toolbars on the left and right. 

On the left toolbar are the drawing tools; users will likely first select the pencil tool, change the brush size, and change the brush color to draw on the canvas in the center of the screen. If the user would like to change something they drew, the undo button will erase the last stroke made by the user and the eraser tool will erase what the user specifies. If users want a custom palette, they can go back to the left toolbar under where they selected their brush color; this palette will save 5 colors until a new palette is generated via the 'Generate New Palette' button. On the bottom of the left toolbar, users can add up to 10 layers in a single drawing, organize these layers in the order they want them to be seen, and give each layer a helpful name.

On the right toolbar are the animation tools. Users can play their short animation at a specified FPS between 1 and 30 at the top, and they can also save their work as a gif for later reference. Under these tools are where each of the frames of your animation sit. Users can toggle the onion skin button on if they would like to see the previous frame and the following frame at a lower opacity, which helps with smoothing out your animation without having to repeatedly go back to other frames. Users can add a new frame (adds a completely blank frame) or duplicate their current frame (in case you only want to change something really small), and this gets added to the animation stack at the bottom right. When playing the animation, the frame that the user sees is highlighted as it traverses the stack and repeats. 


## Technical stack ##

Frontend Frameworks: React, Next.js, CSS/Tailwind

Backend Languages/Frameworks/Libraries: Next.js, React, Javascript, Omggif (Javascript Library), Framer motion (React and Javascript Animation Library)

Hosting: Vercel

## API Utilization ##

Utilized API: Huemint

Huemint (https://api.huemint.com/) is a color palette generator that utilizes machine learning to create color schemes. Artists tend to use color palattes very frequently in their work for consistency and visual appeal, as colors that 'go together' look better and increase retention more than colors that do not really match. Using Huemint, users are able to generate a color palette that they can use to guide their drawing and sense of color for better work rather than relying on the color-picker by itself.

## Instructions for running the project locally ##

To open Sketchan, copy and paste this link into your browser: sketchan-p9brr1dwg-may8craw.vercel.app

## Known limitations ##

While Sketchan allows you to save GIFs of your animation, the gifs themselves may be slightly distorted and add pixels where they aren't present in the actual app. However, since Sketchan is primarily for rough work and assistance with composition and color, I kept the GIF saving feature as-is since it still technically works. 

## What I would improve next ##

1) I would first try to fix the GIF saving feature mentioned above so that it is more reliable and accurate to what users have actually drawn.

2) I want users to be able to change their canvas size and other canvas features in a seperate settings window for more customization of resolution. I wanted this in a seperate window because I didn't want to distract from the main and more frequently utilized features.

3) More tools!! Most other drawing applications have tools such as the Bucket Fill tool and a Select tool, so I would start with integrating these in a way that makes sense before moving on to other simple tools.

4) I want you to be able to save a few images and animations to your browser. Presently, if you refresh the page it deletes what you are working on. 

5) I want Sketchan to look a little bit cleaner and more visually appealing while still remaining simple and navigable, so I would eventually like to adjust how it looks.



Base Project: https://www.codedex.io/projects/build-a-pixel-art-maker-with-html-css-and-javascript
- Credit to this project for giving me a 'Drawing Application' base that I could work from!!

--------------------------------------------------------------------------------------------------------------------

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

[Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) 

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
