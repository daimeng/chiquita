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


function App() {
  const [showDev, setShowDev] = useState(false)
  const [top, setTop] = useState(100)
  const [lastRanking, setLastRanking] = useState(new Map())
  const [ranking, setRanking] = useState([])
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

      const ratings = all_ratings[ev]
      if (ev > 0) {
        const lr = new Map()
        all_ratings[ev - 1].toArray()
          .filter(x => {
            return (playerById.get(x[0]).gender === gender)
              && x[1].rd <= maxdev
          })
          .sort((a, b) => b[1].rating - a[1].rating)
          .forEach(([player, _], i) => {
            lr.set(player, i)
          })

        setLastRanking(lr)
      }

      setRanking(
        ratings.toArray()
          .filter(x =>
            (playerById.get(x[0]).gender === gender)
            && x[1].rd <= maxdev
          )
          .sort((a, b) => b[1].rating - a[1].rating)
      )
    })
  }, [gender, event, maxdev])

  const handleSetEvent = useCallback((e) => setEvent(+e.target.value), [setEvent])
  const handleSetMaxdev = useCallback((e) => setMaxdev(e.target.value), [setMaxdev])
  const handleSetM = useCallback(() => setGender('M'), [setGender])
  const handleSetW = useCallback(() => setGender('W'), [setGender])
  const toggleShowDev = useCallback(() => setShowDev((d) => !d), [setShowDev])
  const handleSetTop = useCallback((e) => setTop(+e.target.value), [setTop])
  const showPlayer = useCallback((e) => setOpenPlayers([+e.target.dataset.playerid]), [setOpenPlayers])
  const hidePlayer = useCallback(() => setOpenPlayers([]), [setOpenPlayers])
  const showBracket = useCallback(() => setBracketOpen(true), [setBracketOpen])
  const hideBracket = useCallback(() => setBracketOpen(false), [setBracketOpen])

  // let min_rating = 0
  // let max_rating = 0
  // if (ranking.length) {
  //   min_rating = ranking[ranking.length - 1][1].rating
  //   max_rating = ranking[0][1].rating
  // }

  const transition = {
    ease: 'easeOut',
    duration: 0.5,
  }

  return (
    <>
      <div className="App">
        <div className="rating_controls">
          <div>
            <button className={gender === 'M' ? 'active' : ''} onClick={handleSetM}>M</button>
            <button className={gender === 'W' ? 'active' : ''} onClick={handleSetW}>W</button>
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
              onChange={handleSetMaxdev} />{maxdev}
          </div>
          <div>
            show rd<input type="checkbox" checked={showDev} onChange={toggleShowDev}></input>
          </div>

          <div className="set-top">
            {'top '}
            <select value={top} onChange={handleSetTop}>
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={Infinity}>All</option>
            </select>
          </div>
          {
            <button id="olympics" onClick={showBracket}>
              Paris 2024
            </button>
          }
          {/* <Login /> */}
        </div>
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
          <img alt="chiquita" src="/chiquita/favicon.svg" width={128} height={128} />
          <div>
            Loading data, please wait... It will take longer the first time.
          </div>
        </div>
        }
        {ranking.map((r, i) => {
          if (i >= top) return null

          const player = playerById.get(r[0])
          const { rating, rd, last_active } = r[1]
          const date = new Date(last_active).toISOString().split('T')[0]
          let rating_delta = 0
          if (event > 0) {
            const last_rating = all_ratings[event - 1].get(r[0])
            if (last_rating) {
              rating_delta = Math.floor(rating) - Math.floor(last_rating.rating)
            }
          }

          const lr = lastRanking.has(r[0]) ? lastRanking.get(r[0]) : lastRanking.size

          return (
            <motion.div
              className="rating_row"
              key={r[0]}
              layout
              transition={transition}
            >
              <span className="rating_rank">{i + 1}</span>
              <span className={`rating_rank_delta ${lr - i < 0 ? 'negative' : lr - i > 0 ? 'positive' : ''}`}>
                {Math.abs(lr - i)}
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
        })}
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
