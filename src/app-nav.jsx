import App from "./app"
import { useHash } from "./hash"

export function AppNav() {
  const [hash, setHash] = useHash()
  console.log(hash)
  return (
    <div className="app-desk">
      <div className="app-nav">
        <button className="app-nav-tab" onClick={() => setHash('/ranking')}>
          Ranking
        </button>
        <button className="app-nav-tab" onClick={() => setHash('/starmap')}>
          Starmap
        </button>
      </div>
      {
        hash === '#/ranking' && <App />
      }
    </div>
  )
}
