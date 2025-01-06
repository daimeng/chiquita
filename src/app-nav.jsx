import App from "./app"
import { useHash } from "./hash"
import { Starmap } from "./starmap"

export function AppNav() {
  const [hash, setHash] = useHash()

  let content
  if (hash === '#/starmap') {
    content = <Starmap />
  } else {
    content = <App />
  }

  return (
    <div className="app-desk">
      {/* <div className="app-nav">
        <button className="app-nav-tab" onClick={() => setHash('/ranking')}>
          Ranking
        </button>
        <button className="app-nav-tab" onClick={() => setHash('/starmap')}>
          Starmap
        </button>
      </div> */}
      {content}
    </div>
  )
}
