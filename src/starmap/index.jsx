import './starmap.css'
import { Application, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";

export function Starmap() {
  const container = useRef(null)

  useEffect(() => {
    if (!container.current) return;
    // Create a PixiJS application.
    const app = new Application();

    (async () => {
      // Intialize the application.
      await app.init({ background: '#1099bb', resizeTo: container.current })

      const g = new Graphics()
        .circle(50, 50, 50)
        .fill(0xff0000)
      g.interactive = true
      g.onclick = () => {
        console.log('test')
      }

      app.stage.addChild(g)

      // Then adding the application's canvas to the DOM body.
      container.current.replaceChildren(app.canvas)
    })()

  }, [])

  return (
    <div className="starmap-container" ref={container}></div>
  )
}