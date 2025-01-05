import './App.css'
import { useCallback, useEffect, useState } from 'react'
import tournaments from './tournaments.json'
import { motion } from 'framer-motion'
import { ISO3to2, ISO3toColor } from './country-map'
import { playerById, tournamentById } from './idb'
import { all_ratings, init, rating_changes } from './ratings'
import { auth, login, signUp } from './firebase'
import { Login } from './login'
import { EmptyCard, PlayerCard } from './playercard'
import { BracketCard } from './bracket'
import { useHash } from './hash'
import { ymd } from './fast-dt'

function App() {
  const [showDev, setShowDev] = useState(false)
  const [top, setTop] = useState(100)
  const [event, setEvent] = useState(-1)
  const [gender, setGender] = useState('M')
  const [maxdev, setMaxdev] = useState(100)
  const [openPlayers, setOpenPlayers] = useState([])
  // const [hash, setHash] = useHash()
  const [bracketOpen, setBracketOpen] = useState(false)

  useEffect(() => {
    init.then(() => {
      let ev = event
      // event won't update right away
      if (ev === -1) {
        ev = all_ratings.length - 1
        setEvent(ev)
      }
    })
  }, [])

  const handleSetEvent = useCallback((e) => setEvent(+e.target.value), [setEvent])
  const showPlayer = useCallback((e) => setOpenPlayers([+e.target.dataset.playerid]), [setOpenPlayers])
  const hidePlayer = useCallback(() => setOpenPlayers([]), [setOpenPlayers])
  const hideBracket = useCallback(() => setBracketOpen(false), [setBracketOpen])

  return (
    <>
      <div className="App">
        <div className="rating_controls">
          <div>
            <button className={gender === 'M' ? 'active' : ''} onClick={() => setGender('M')}>M</button>
            <button className={gender === 'W' ? 'active' : ''} onClick={() => setGender('W')}>W</button>
          </div>

          <div className="set-event">
            <select value={event} onChange={handleSetEvent}>
              {tournaments.map((t, i) => {
                return <option key={t.EventId} value={i}>{`${t.EventName}`}</option>
              })}true
            </select>
          </div>

          <div className="set-maxdev">
            {"max rd: "}
            <input type="range" min="0" max="350" step="10" value={maxdev}
              onChange={e => setMaxdev(e.target.value)} />{maxdev}
          </div>
          <div>
            show rd<input type="checkbox" checked={showDev} onChange={() => setShowDev((d) => !d)}></input>
          </div>

          <div className="set-top">
            {'top '}
            <select value={top} onChange={e => setTop(+e.target.value)}>
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={Infinity}>All</option>
            </select>
          </div>
          {
            <button id="olympics" onClick={() => setBracketOpen(true)}>
              Paris 2024
            </button>
          }
          {/* <Login /> */}
        </div>
        <RankTable event={event} gender={gender} maxdev={maxdev} showDev={showDev} showPlayer={showPlayer} />
      </div>

      <div className="player-panel">
        {openPlayers.length === 1
          && <PlayerCard
            playerid={openPlayers[0]}
            hidePlayer={hidePlayer}
            showPlayer={showPlayer}
          />
        }
      </div>

      <div className="bracket-panel">
        {bracketOpen
          && <BracketCard
            hideBracket={hideBracket}
          />
        }
      </div>
    </>
  );
}

export default App;


function RankTable({ event, gender, maxdev, showDev, showPlayer }) {
  // const [lastRanking, setLastRanking] = useState(new Map())
  // const [ranking, setRanking] = useState([])

  let ranking = []
  const lastRanking = new Map()

  if (event !== -1) {
    const ratings = all_ratings[event]
    if (event > 0) {
      const ranks = []
      all_ratings[event - 1].forEach((v, k) => {
        if (
          playerById.get(k).gender === gender
          && v.rd <= maxdev
        ) {
          ranks.push([k, v])
        }
      })
      ranks.sort((a, b) => b[1].rating - a[1].rating)
      ranks.forEach(([player, _], i) => {
        lastRanking.set(player, i)
      })
    }

    {
      ratings.forEach((v, k) => {
        if (
          playerById.get(k).gender === gender
          && v.rd <= maxdev
        ) {
          ranking.push([k, v])
        }
      })
      ranking.sort((a, b) => b[1].rating - a[1].rating)
    }
  }

  return (
    <div className="rank-table">
      <div className="rating_row" key="title">
        <span className="rating_rank">#</span>
        <span className="rating_rank_delta"></span>
        <span className="rating_flag"></span>
        <span className="rating_org">org</span>
        <span className="rating_name">name</span>
        <span className="rating_rating">pts</span>
        <span className="rating_delta"></span>
        {showDev &&
          <>
            <span className="rating_dev">±</span>
            <span className="rating_active">active</span>
          </>
        }
        <span className="rating_bar"></span>
      </div>
      {ranking.length === 0 && <div className="loading">
        <img alt="chiquita" src="./favicon.svg" width={128} height={128} />
        <div>
          Loading data, please wait... It will take longer the first time.
        </div>
      </div>
      }
      {ranking.map((r, i) => {
        if (i >= top) return

        return <RankRow key={r[0]} i={i} r={r}
          event={event}
          lastRanking={lastRanking}
          showPlayer={showPlayer}
          showDev={showDev}
        />
      })}
    </div>
  )
}

const rowtransition = {
  ease: 'easeOut',
  duration: 0.5,
}

function RankRow({ r, i, event, lastRanking, showPlayer, showDev }) {
  const player = playerById.get(r[0])
  const { rating, rd, last_active } = r[1]
  const date = ymd(last_active)
  let rating_delta = 0
  if (event > 0) {
    const last_rating = all_ratings[event - 1].get(r[0])
    if (last_rating) {
      rating_delta = Math.floor(rating) - Math.floor(last_rating.rating)
    }
  }

  const lr = lastRanking.has(r[0]) ? lastRanking.get(r[0]) : Infinity

  return (
    <motion.div
      className="rating_row"
      layout
      transition={rowtransition}
    >
      <span className="rating_rank">{i + 1}</span>
      <span className={`rating_rank_delta ${lr - i < 0 ? 'negative' : lr - i > 0 ? 'positive' : ''}`}>
        {lr === Infinity ? '--' : Math.abs(lr - i)}
      </span>
      <span className="rating_flag">
        <span className={`fi fi-${ISO3to2[player.org]}`}></span>
      </span>
      <span className="rating_org">{player.org}</span>
      <span className="rating_name" data-playerid={r[0]} onClick={showPlayer}>{player.name}</span>
      <span className="rating_rating">{Math.floor(rating)}</span>
      <span className={`rating_delta ${rating_delta < 0 ? 'negative' : rating_delta > 0 ? 'positive' : ''}`}>
        {Math.abs(rating_delta)}
      </span>
      {showDev &&
        <>
          <span className="rating_dev">{Math.floor(rd)}</span>
          <span className="rating_active">{date}</span>
        </>
      }
      <span className="rating_bar">
        <span style={{
          width: `${Math.max(rating - 1400, 0) / 16}%`,
          backgroundColor: ISO3toColor[player.org],
        }}>
        </span>
      </span>
    </motion.div>
  )

}