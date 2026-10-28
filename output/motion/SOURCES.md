# Inventora motion demo

26 seconds, 1280 × 720, 24 fps, silent MP4. The visuals are original illustrations of Inventora workflows using sample data, not a screen recording. No customer data, credentials, or project source is sent to a rendering service. The POS scene states that storage is browser-local and not synced to Firestore. Procurement and POS scenes are separate examples.

The original four-square logo geometry and Plus Jakarta Sans are retained. `render_demo.py` is editable and renders frames as a deterministic function of time. Install Pillow and ffmpeg or imageio-ffmpeg, then run `python render_demo.py`.

Motion references researched with the 24fps-motion skill:

- Slide over left — **24fps.dev/video-editor**: https://24fps.dev/video-editor/transitions/slide-over-left-cat1 . Incoming frame covers the stationary outgoing frame; timing adapted to 450 ms.
- Slide over up — **24fps.dev/video-editor**: https://24fps.dev/video-editor/transitions/slide-over-up-cat1 . Used as a direction reference for mobile app sheets.
- SaaS Product Launch Video — **@pbteja1998**: https://24fps.dev/c/saas-product-launch-video-00249 . Catalogue/prompt reference for a short feature walkthrough; no clip or source copied.
- Brand Rebuild Product Sting — **@notdwd**: https://24fps.dev/c/brand-rebuild-product-sting-with-html-canvas-and-playwright-02758 . Catalogue/prompt reference for a concise brand introduction; no clip or source copied.
- Product demo style: https://24fps.dev/explainers#cursor-zoom-demo . Adapted to the existing light Inventora design without cursor zoom, blur, or sound.

Plus Jakarta Sans: https://github.com/google/fonts/tree/main/ofl/plusjakartasans . Font redistributed with its SIL Open Font License in `assets/OFL.txt`.

No third-party clip is rehosted. App interactions reuse the existing `motion/react` dependency; the video does not add a browser video framework to the application bundle.
