## Project name ##

Sketchan 

(Sketch and Animate -> Sketch An -> Sketchan)


## WIP Figma Video ##

https://github.com/user-attachments/assets/00b92917-93d0-498f-8d5b-e78c5ad588e3

## Intended Audience ##

The intended audience for Sketchan are digital artists and animators who want to quickly iterate on an animatic idea or experiment with color and composition. Users are able to visit Sketchan to test animations in a simple and compact 2D space.

## Problem/Opportunity ##

When I was creating Sketchan, I had these two major problems in mind: 

- A lot of animation applications can feel very overwhelming and confusing to beginners. Using Sketchan, I wanted to give beginners an opportunity to create short GIFs and animations without having to parse through an expansive interface. With Sketchan, it is simply the user and the canvas with straightforward tools.

- As an artist, I know what it is like to have a sudden idea that I would like to test (at work or hanging out with friends, for instance) before I forget it. However, in these moments I often do not have my digital art tools with me; even when I do, opening a heavy animation software can just be unnecessary for quick ideas. Sketchan was created so that anyone can test and save a simple composition or animation idea.

## Primary User Flow ##

Sketchan has one primary screen with curated toolbars on the left and right. 

On the left toolbar are the drawing tools; users will likely first select the pencil tool, change the brush size, and change the brush color to draw on the canvas in the center of the screen.  The eraser tool will erase what the user specifies. The bucket fill tool will fill in a closed shape with the selected color. The select tool will select a stroke made by the user and allow them to move it around the canvas as one shape. If users want a custom palette, they can go back to the left toolbar under where they selected their brush color; this palette will save 5 colors until a new palette is generated via the 'New Palette' button. On the bottom of the left toolbar, users can add up to 10 layers in a single drawing, organize these layers in the order they want them to be seen, toggle the visibility of each layer, and give each layer a helpful name.

In the center canvas area, the undo button in the top right will erase the last stroke made by the user. Users can draw within the canvas box.

On the right toolbar are the animation tools. Users can play their short animation at a specified FPS between 1 and 30 at the top, and they can also save their work as a GIF for later reference. Under these tools are where each of the frames of your animation sit. Users can toggle the onion skin button on if they would like to see the previous frame and the following frame at a lower opacity, which helps with smoothing out your animation without having to repeatedly go back to other frames. Users can add a new frame (adds a completely blank frame) or duplicate their current frame (in case you only want to change something really small), and this gets added to the animation stack at the bottom right. When playing the animation, the frame that the user sees is highlighted as it traverses the stack and repeats. At the very top of the right toolbar, users can now zoom in and zoom out of their canvas to see better as well as reset the zoom to its default value.

In the top left of the screen near the SketchAn logo, you can click on the settings button for additional settings. This includes changing the width and height of the canvas you are drawing on, exporting your current frame as a PNG, and saving up to three projects to your browser (including if you made any animations).

## Technical stack ##

Frontend Frameworks: React, Next.js, CSS/Tailwind

Backend Languages/Frameworks/Libraries: Next.js, React, Javascript, Omggif (Javascript Library), Framer motion (React and Javascript Animation Library)

Hosting: Vercel

Additional Coding and Debugging Help: Google Gemini

## API Utilization ##

Utilized API: Huemint

Huemint (https://api.huemint.com/) is a color palette generator that utilizes machine learning to create color schemes. Artists tend to use color palattes very frequently in their work for consistency and visual appeal, as colors that 'go together' look better and increase retention more than colors that do not really match. Using Huemint, users are able to generate a color palette that they can use to guide their drawing and sense of color for better work rather than relying on the color-picker by itself.

## Instructions for running the project locally ##

To open Sketchan, copy and paste this link into your browser: sketchan-p9brr1dwg-may8craw.vercel.app

## Known limitations ##

While Sketchan allows you to save GIFs of your animation, the gifs themselves may be slightly distorted and add pixels where they aren't present in the actual app. However, since Sketchan is primarily for rough work and assistance with composition and color, I kept the GIF saving feature as-is since it still technically works. Furthermore, you are unable to move or rotate the canvas you are using, and I think this would be useful to mimic drawing on an actual piece of paper.

## What I would improve next ##

1) I would want to try and fix the GIF saving feature mentioned above so that it is more reliable and accurate to what users have actually drawn. I didn't prioritize it in my second version because I found editing it tricky and wanted to expand a bit more in other ways, but in the next version I would really like to focus on making the GIF saving feature better.

2) To address my second limitation, I would like to make it so that you can move the canvas anywhere you want (including rotating the canvas) without having the canvas stuck in the top left corner. This is something that is often done for every drawing software I have utilized, and I tend to appreciate the freedom this feature gives the user. Furthermore, I would love for you to be able to reset the canvas back to an original/default position, much like the zoom feature I already have.

3) I really want to continue working on the visual design of SketchAn. There were a few things that I was unsure how to do without messing up something else in the program that I think would make the user interface simpler and more organized, so I would want to keep tweaking this design until it's at a place where tweaks seem unnecessary.



Base Project: https://www.codedex.io/projects/build-a-pixel-art-maker-with-html-css-and-javascript
- Credit to this project for giving me a 'Drawing Application' base that I could work from!!

