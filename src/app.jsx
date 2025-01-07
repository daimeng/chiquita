import './app.css'
import { useCallback, useEffect, useState } from 'react'
import tournaments from './tournaments.json'
import { motion } from 'framer-motion'
import { ISO3to2, ISO3toColor } from './country-map'
import { playerById, resetDB, tournamentById } from './idb'
import { all_ranks, all_ranks_by_id, all_ratings, init, rating_changes } from './ratings'
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
      <div className="app">
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
          <button className="simple-tip" onClick={resetDB}>
            !
            <div className="simple-tip-hover">
              Click to reset database if something looks wrong.
            </div>
          </button>
          {/* {
            <button id="olympics" onClick={() => setBracketOpen(true)}>
              Paris 2024
            </button>
          } */}
          {/* <Login /> */}
        </div>
        <RankTable event={event} top={top} gender={gender} maxdev={maxdev} showDev={showDev} showPlayer={showPlayer} />
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


function RankTable({ event, top, gender, maxdev, showDev, showPlayer }) {
  let ranking = []
  let lastRanking
  let rankrows = []

  if (event !== -1) {
    ranking = all_ranks[event]
    if (event > 0) {
      lastRanking = all_ranks_by_id[event - 1]
    } else {
      lastRanking = new Map()
    }

    const player_ratings = all_ratings[event]
    const ranks_by_id = all_ranks_by_id[event]

    let picked = 0
    for (let i = 0; i < ranking.length; i++) {
      // top limit
      if (picked > top) break
      const playerId = ranking[i]

      // skip gender
      const player = playerById.get(playerId)
      if (player.gender !== gender) continue

      // skip above maxdev
      const rating = player_ratings.get(playerId)
      if (rating.rd > maxdev) continue

      picked += 1

      rankrows.push(
        <RankRow key={playerId}
          i={ranks_by_id.get(playerId)}
          r={rating}
          playerId={playerId}
          event={event}
          lastRanking={lastRanking}
          showPlayer={showPlayer}
          showDev={showDev}
        />
      )
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
      {
        ranking.length === 0 && <div className="loading">
          <img alt="chiquita" src="./favicon.svg" width={128} height={128} />
          <div>
            Loading data, please wait... It will take longer the first time.
          </div>
        </div>
      }
      {rankrows}
    </div>
  )
}

const rowtransition = {
  ease: 'easeOut',
  duration: 0.5,
}

function RankRow({ r, i, playerId, event, lastRanking, showPlayer, showDev }) {
  const player = playerById.get(playerId)

  const { rating, rd, last_active } = r
  const date = ymd(last_active)

  let rating_delta = 0
  if (event > 0) {
    const last_rating = all_ratings[event - 1].get(playerId)
    if (last_rating) {
      rating_delta = Math.floor(rating) - Math.floor(last_rating.rating)
    }
  }

  const lr = lastRanking.has(playerId) ? lastRanking.get(playerId) : Infinity

  return (
    <motion.div
      className="rating_row"
      layout
      transition={rowtransition}
    >
      <span className="rating_rank">{i == null ? '--' : i + 1}</span>
      <span className={`rating_rank_delta ${lr - i < 0 ? 'negative' : lr - i > 0 ? 'positive' : ''}`}>
        {lr === Infinity || i === null ? '--' : Math.abs(lr - i)}
      </span>
      <span className="rating_flag">
        <span className={`fi fi-${ISO3to2[player.org]}`}></span>
      </span>
      <span className="rating_org">{player.org}</span>
      <span className="rating_name" data-playerid={playerId} onClick={showPlayer}>{player.name}</span>
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