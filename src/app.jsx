import './app.css'
import { useCallback, useEffect, useState } from 'react'
import tournaments from './tournaments.json'
import { motion } from 'framer-motion'
import { ISO3to2, ISO3toColor } from './country-map'
import { playerById, resetDB, tournamentById, tournamentsByIx } from './idb'
import { all_ranks, all_ranks_by_id, all_ratings, init, rating_changes } from './ratings'
import { init_doubles, doubles_all_ranks, doubles_all_ranks_by_id, doubles_all_ratings } from './doubles-ratings'
import { auth, login, signUp } from './firebase'
import { Login } from './login'
import { PlayerCard, DoublesPlayerCard, HeadToHeadCard } from './playercard'
import { BracketCard } from './bracket'
import { useHash } from './hash'
import { TournamentCard, DoublesTournamentCard } from './event'

function App() {
  const [top, setTop] = useState(100)
  const [event, setEvent] = useState(-1)
  const [gender, setGender] = useState('M')
  const [maxdev, setMaxdev] = useState(100)
  const [openPlayers, setOpenPlayers] = useState([])
  const [openTournament, setOpenTournament] = useState(null)
  const [bracketOpen, setBracketOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 910)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 910)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    Promise.all([init, init_doubles]).then(() => {
      let ev = event
      // event won't update right away
      if (ev === -1) {
        ev = all_ratings.length - 1
        setEvent(ev)
      }
    })
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'ArrowLeft') {
        setEvent(ev => Math.max(ev - 1, 0))
      } else if (event.key === 'ArrowRight') {
        setEvent(ev => Math.min(ev + 1, tournaments.length - 1))
      }
      return false
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [])

  const handleSetEvent = useCallback((e) => setEvent(+e.target.value), [setEvent])
  const showPlayer = useCallback((e) => { setOpenTournament(null); setOpenPlayers([+e.target.dataset.playerid]) }, [setOpenPlayers])
  const hidePlayer = useCallback(() => setOpenPlayers([]), [setOpenPlayers])
  const showHeadToHead = useCallback((p1, p2) => {
    setOpenPlayers([p1, p2])
  }, [setOpenPlayers])
  // const hideBracket = useCallback(() => setBracketOpen(false), [setBracketOpen])

  return (
    <>
      <div className="app">
        <div className="rating_controls">
          <div>
            <button className={gender === 'M' ? 'active' : ''} onClick={() => setGender('M')}>M</button>
            <button className={gender === 'W' ? 'active' : ''} onClick={() => setGender('W')}>W</button>
            <button className={gender === 'MD' ? 'active' : ''} onClick={() => setGender('MD')}>MD</button>
            <button className={gender === 'WD' ? 'active' : ''} onClick={() => setGender('WD')}>WD</button>
            <button className={gender === 'X' ? 'active' : ''} onClick={() => setGender('X')}>X</button>
          </div>

          <div className="set-event">
            <button className="event-left" onClick={() => setEvent(ev => Math.max(ev - 1, 0))}>◀</button>
            <select value={event} onChange={handleSetEvent}>
              {tournaments.map((t, i) => {
                return <option key={t.EventId} value={i}>{isMobile ? t.ShortName : t.EventName}</option>
              })}
            </select>
            <button className="event-open" onClick={() => { setOpenTournament(tournamentsByIx[event].EventId); hidePlayer() }}>show</button>
            <button className="event-right" onClick={() => setEvent(ev => Math.min(ev + 1, tournaments.length - 1))}>▶</button>
          </div>

          {!['MD', 'WD', 'X'].includes(gender) && (
            <div className="set-maxdev">
              {"max rd: "}
              <input type="range" min="0" max="350" step="10" value={maxdev}
                onChange={e => setMaxdev(e.target.value)} />{maxdev}
            </div>
          )}

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
          <button className="simple-tip" onClick={() => {
            if (window.confirm("Reset database?")) {
              resetDB();
            }
          }}>
            !
            <div className="simple-tip-hover">
              Click to reset database if anything looks wrong.
            </div>
          </button>
          {/* {
            <button id="olympics" onClick={() => setBracketOpen(true)}>
              Paris 2024
            </button>
          } */}
          {/* <Login /> */}
        </div>
        {['M', 'W'].includes(gender) ? (
          <RankTable event={event} top={top} gender={gender} maxdev={maxdev} showPlayer={showPlayer} />
        ) : (
          <DoublesRankTable event={event} top={top} gender={gender} showPlayer={showPlayer} />
        )}
      </div>

      <div className="player-panel">
        {openPlayers.length === 1 && (
          ['MD', 'WD', 'X'].includes(gender) ? (
            <DoublesPlayerCard
              playerid={openPlayers[0]}
              hidePlayer={hidePlayer}
              showPlayer={showPlayer}
              showTourney={(e) => {
                setOpenTournament(+e.target.dataset.eventid)
                hidePlayer()
              }}
            />
          ) : (
            <PlayerCard
              playerid={openPlayers[0]}
              hidePlayer={hidePlayer}
              showPlayer={showPlayer}
              showHeadToHead={showHeadToHead}
              showTourney={(e) => {
                setOpenTournament(+e.target.dataset.eventid)
                hidePlayer()
              }}
            />
          )
        )}
        {openPlayers.length === 2 && (
          <HeadToHeadCard
            player1Id={openPlayers[0]}
            player2Id={openPlayers[1]}
            hideCard={() => setOpenPlayers([openPlayers[0]])}
            showPlayer={showPlayer}
            showTourney={(e) => {
              setOpenTournament(+e.target.dataset.eventid)
              hidePlayer()
            }}
          />
        )}
      </div>

      <div className="bracket-panel">
        {(openTournament != null) && (
          ['MD', 'WD', 'X'].includes(gender) ? (
            <DoublesTournamentCard
              event_id={openTournament}
              close={() => setOpenTournament(null)}
              showPlayer={showPlayer}
            />
          ) : (
            <TournamentCard
              event_id={openTournament}
              close={() => setOpenTournament(null)}
              showPlayer={showPlayer}
            />
          )
        )}
      </div>
    </>
  );
}

export default App;


function RankTable({ event, top, gender, maxdev, showPlayer }) {
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
      if (picked >= top) break
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
          maxdev={maxdev}
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
        <span className="rating_sparkline">trend</span>
        <span className="rating_slope has-tooltip">
          ppm
          <div className="tooltip-text">Points per month</div>
        </span>
        <span className="rating_dev">±</span>
        <span className="rating_active">active</span>
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

const FMT_DATE = new Date()

function RankRow({ r, i, playerId, event, lastRanking, showPlayer, maxdev }) {
  const player = playerById.get(playerId)

  const { rating, rd, last_active } = r
  FMT_DATE.setTime(last_active)
  const date = FMT_DATE.toISOString().slice(0, 10)

  let rating_delta = 0
  if (event > 0) {
    const last_rating = all_ratings[event - 1].get(playerId)
    if (last_rating) {
      rating_delta = Math.floor(rating) - Math.floor(last_rating.rating)
    }
  }

  const lr = lastRanking.get(playerId) === undefined ? Infinity : lastRanking.get(playerId)
  const rankChangedWithoutRating = rating_delta === 0 && lr !== Infinity && i !== null && lr - i !== 0

  let deltaChars = '';
  if (rating_delta > 0) {
    deltaChars = '+'.repeat(Math.min(5, Math.ceil(rating_delta / 10)));
  } else if (rating_delta < 0) {
    deltaChars = '-'.repeat(Math.min(5, Math.ceil(Math.abs(rating_delta) / 10)));
  }

  const currentEventTime = Date.parse(tournaments[event].EndDateTime)
  const oneYearAgo = currentEventTime - 365 * 24 * 60 * 60 * 1000

  const points = []
  for (let e = 0; e <= event; e++) {
    const eTime = Date.parse(tournaments[e].EndDateTime)
    if (eTime >= oneYearAgo && eTime <= currentEventTime) {
      const rObj = all_ratings[e]?.get(playerId)
      if (rObj && rObj.rd <= maxdev) {
        points.push({ time: eTime, rating: rObj.rating })
      }
    }
  }

  let ppmStr = '--'
  let ppmClass = ''
  if (points.length >= 2) {
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumXX = 0
    for (let p of points) {
      const xVal = (p.time - oneYearAgo) / (24 * 60 * 60 * 1000)
      const yVal = p.rating
      sumX += xVal
      sumY += yVal
      sumXY += xVal * yVal
      sumXX += xVal * xVal
    }
    const denominator = points.length * sumXX - sumX * sumX
    const slope = denominator === 0 ? 0 : (points.length * sumXY - sumX * sumY) / denominator
    const ppm = slope * 30
    const roundedPpm = Math.round(ppm)
    ppmStr = roundedPpm > 0 ? `+${roundedPpm}` : `${roundedPpm}`
    ppmClass = roundedPpm > 0 ? 'positive' : roundedPpm < 0 ? 'negative' : ''
  }

  return (
    <motion.div
      className={`rating_row ${rating_delta > 0 ? 'points-won' : rating_delta < 0 ? 'points-lost' : ''}`}
      layout
      transition={rowtransition}
    >
      <span className="rating_rank">{i == null ? '--' : i + 1}</span>
      <span className={`rating_rank_delta ${lr - i < 0 ? 'negative' : lr - i > 0 ? 'positive' : ''} ${rankChangedWithoutRating ? 'passive' : ''}`}>
        {i === null ? '--' : (lr === Infinity ? '>>' : Math.abs(lr - i))}
      </span>
      <span className="rating_flag">
        <span className={`fi fi-${ISO3to2[player.org]}`}></span>
      </span>
      <span className="rating_org">{player.org}</span>
      <span className="rating_name" data-playerid={playerId} onClick={showPlayer}>{player.name}</span>
      <span className={`rating_rating ${rd > 80 ? 'stale' : ''}`}>{Math.floor(rating)}</span>
      <span className={`rating_delta ${rating_delta < 0 ? 'negative' : rating_delta > 0 ? 'positive' : ''}`}>
        <span className="delta_chars">{deltaChars}</span>
        <span className="delta_number">{Math.abs(rating_delta)}</span>
      </span>
      <span className="rating_sparkline">
        <Sparkline points={points} oneYearAgo={oneYearAgo} currentEventTime={currentEventTime} />
      </span>
      <span className={`rating_slope ${ppmClass}`}>{ppmStr}</span>
      <span className="rating_dev">{Math.floor(rd)}</span>
      <span className="rating_active">{date}</span>
      <span className="rating_bar">
        <span style={{
          width: `${Math.max(rating - 1400, 0) / 12}%`,
          backgroundColor: ISO3toColor[player.org],
        }}>
        </span>
      </span>
    </motion.div>
  )
}

function DoublesRankTable({ event, top, gender, showPlayer }) {
  let ranking = []
  let lastRanking
  let rankrows = []

  if (event !== -1) {
    ranking = doubles_all_ranks[event] || []
    if (event > 0) {
      lastRanking = doubles_all_ranks_by_id[event - 1] || new Map()
    } else {
      lastRanking = new Map()
    }

    const player_ratings = doubles_all_ratings[event] || new Map()
    const ranks_by_id = doubles_all_ranks_by_id[event] || new Map()

    let picked = 0
    for (let i = 0; i < ranking.length; i++) {
      if (picked >= top) break
      const playerId = ranking[i]

      const player = playerById.get(playerId)
      if (!player) continue

      if (gender === 'MD' && player.gender !== 'M') continue
      if (gender === 'WD' && player.gender !== 'W') continue

      const rating = player_ratings.get(playerId)
      if (!rating) continue

      picked += 1

      const getRankVal = (map, pid) => {
        const val = map.get(pid)
        if (!val) return null
        return gender === 'MD' ? val.MD : gender === 'WD' ? val.WD : val.X
      }

      rankrows.push(
        <DoublesRankRow key={playerId}
          i={getRankVal(ranks_by_id, playerId)}
          r={rating}
          playerId={playerId}
          event={event}
          lastRanking={lastRanking}
          gender={gender}
          showPlayer={showPlayer}
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
        <span className="rating_sparkline">trend</span>
        <span className="rating_slope has-tooltip">
          ppm
          <div className="tooltip-text">Points per month</div>
        </span>
        <span className="rating_active">active</span>
        <span className="rating_bar"></span>
      </div>
      {
        ranking.length === 0 && <div className="loading">
          <img alt="chiquita" src="./favicon.svg" width={128} height={128} />
          <div>
            Loading doubles data, please wait...
          </div>
        </div>
      }
      {rankrows}
    </div>
  )
}

function DoublesRankRow({ r, i, playerId, event, lastRanking, gender, showPlayer }) {
  const player = playerById.get(playerId)

  const { rating, last_active } = r
  FMT_DATE.setTime(last_active)
  const date = FMT_DATE.toISOString().slice(0, 10)

  let rating_delta = 0
  if (event > 0) {
    const last_rating = doubles_all_ratings[event - 1]?.get(playerId)
    if (last_rating) {
      rating_delta = Math.floor(rating) - Math.floor(last_rating.rating)
    }
  }

  const getRankVal = (map, pid) => {
    const val = map.get(pid)
    if (!val) return Infinity
    const rank = gender === 'MD' ? val.MD : gender === 'WD' ? val.WD : val.X
    return rank === undefined ? Infinity : rank
  }

  const lr = getRankVal(lastRanking, playerId)
  const rankChangedWithoutRating = rating_delta === 0 && lr !== Infinity && i !== null && lr - i !== 0

  let deltaChars = '';
  if (rating_delta > 0) {
    deltaChars = '+'.repeat(Math.min(5, Math.ceil(rating_delta / 10)));
  } else if (rating_delta < 0) {
    deltaChars = '-'.repeat(Math.min(5, Math.ceil(Math.abs(rating_delta) / 10)));
  }

  const currentEventTime = Date.parse(tournaments[event].EndDateTime)
  const oneYearAgo = currentEventTime - 365 * 24 * 60 * 60 * 1000

  const points = []
  for (let e = 0; e <= event; e++) {
    const eTime = Date.parse(tournaments[e].EndDateTime)
    if (eTime >= oneYearAgo && eTime <= currentEventTime) {
      const rObj = doubles_all_ratings[e]?.get(playerId)
      if (rObj) {
        points.push({ time: eTime, rating: rObj.rating })
      }
    }
  }

  let ppmStr = '--'
  let ppmClass = ''
  if (points.length >= 2) {
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumXX = 0
    for (let p of points) {
      const xVal = (p.time - oneYearAgo) / (24 * 60 * 60 * 1000)
      const yVal = p.rating
      sumX += xVal
      sumY += yVal
      sumXY += xVal * yVal
      sumXX += xVal * xVal
    }
    const denominator = points.length * sumXX - sumX * sumX
    const slope = denominator === 0 ? 0 : (points.length * sumXY - sumX * sumY) / denominator
    const ppm = slope * 30
    const roundedPpm = Math.round(ppm)
    ppmStr = roundedPpm > 0 ? `+${roundedPpm}` : `${roundedPpm}`
    ppmClass = roundedPpm > 0 ? 'positive' : roundedPpm < 0 ? 'negative' : ''
  }

  return (
    <motion.div
      className={`rating_row ${rating_delta > 0 ? 'points-won' : rating_delta < 0 ? 'points-lost' : ''}`}
      layout
      transition={rowtransition}
    >
      <span className="rating_rank">{i == null ? '--' : i + 1}</span>
      <span className={`rating_rank_delta ${lr - i < 0 ? 'negative' : lr - i > 0 ? 'positive' : ''} ${rankChangedWithoutRating ? 'passive' : ''}`}>
        {i === null ? '--' : (lr === Infinity ? '>>' : Math.abs(lr - i))}
      </span>
      <span className="rating_flag">
        <span className={`fi fi-${ISO3to2[player.org]}`}></span>
      </span>
      <span className="rating_org">{player.org}</span>
      <span className="rating_name" data-playerid={playerId} onClick={showPlayer}>{player.name}</span>
      <span className="rating_rating">{Math.floor(rating)}</span>
      <span className={`rating_delta ${rating_delta < 0 ? 'negative' : rating_delta > 0 ? 'positive' : ''}`}>
        <span className="delta_chars">{deltaChars}</span>
        <span className="delta_number">{Math.abs(rating_delta)}</span>
      </span>
      <span className="rating_sparkline">
        <Sparkline points={points} oneYearAgo={oneYearAgo} currentEventTime={currentEventTime} />
      </span>
      <span className={`rating_slope ${ppmClass}`}>{ppmStr}</span>
      <span className="rating_active">{date}</span>
      <span className="rating_bar">
        <span style={{
          width: `${Math.max(rating - 1400, 0) / 12}%`,
          backgroundColor: ISO3toColor[player.org],
        }}>
        </span>
      </span>
    </motion.div>
  )
}

function Sparkline({ points, oneYearAgo, currentEventTime }) {
  const width = 80
  const height = 20
  const padding = 2

  if (!points || points.length === 0) {
    return <span style={{ color: '#555' }}>--</span>
  }

  if (points.length === 1) {
    const x = ((points[0].time - oneYearAgo) / (currentEventTime - oneYearAgo)) * width
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1.5}
          opacity={0.4}
        />
        <circle cx={x} cy={height / 2} r={3} fill="currentColor" />
      </svg>
    )
  }

  const ratings = points.map(p => p.rating)
  const minRating = Math.min(...ratings)
  const maxRating = Math.max(...ratings)
  const range = maxRating - minRating

  const pathParts = points.map((p, index) => {
    const x = ((p.time - oneYearAgo) / (currentEventTime - oneYearAgo)) * width
    const y = range === 0
      ? height / 2
      : height - padding - ((p.rating - minRating) / range) * (height - 2 * padding)
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  })
  const d = pathParts.join(' ')

  const lastPoint = points[points.length - 1]
  const lastX = ((lastPoint.time - oneYearAgo) / (currentEventTime - oneYearAgo)) * width
  const lastY = range === 0
    ? height / 2
    : height - padding - ((lastPoint.rating - minRating) / range) * (height - 2 * padding)

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
    </svg>
  )
}