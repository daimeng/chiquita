import { isoFormat, line, path, scaleLinear, scaleLog, scalePow, scaleSqrt, scaleTime, utcFormat, utcMonth } from 'd3'
import './playercard.css'
import tournaments from './tournaments.json'
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { playerById, tournamentById } from "./idb"
import { all_ranks_by_id, all_ratings, init, player_ratings, rating_changes } from "./ratings"
import { doubles_all_ranks_by_id, doubles_all_ratings, init_doubles, doubles_player_ratings, doubles_rating_changes } from "./doubles-ratings"
import { STAGE_TO_NUM } from "./priority"
import { sortStartStage } from './event'

export function PlayerCard({ playerid, showPlayer, hidePlayer, showTourney }) {
  const player = playerById.get(playerid)
  const [matches, setMatches] = useState([])
  const [showVenue, setShowVenue] = useState(true)

  useEffect(() => {
    init.then((db) => {
      return Promise.all([
        db.getAllFromIndex('matches', 'a_id', playerid),
        db.getAllFromIndex('matches', 'x_id', playerid)
      ])
    }).then(([matches_a, matches_x]) => {
      // decorate matches with their rating changes
      const all_matches = []
      for (let i = matches_a.length - 1; i >= 0; i--) {
        matches_a[i].rc = rating_changes.get(matches_a[i].id)
        matches_a[i].end = Date.parse(tournamentById.get(matches_a[i].event_id).EndDateTime)
        all_matches.push(matches_a[i])
      }
      for (let i = matches_x.length - 1; i >= 0; i--) {
        matches_x[i].rc = rating_changes.get(matches_x[i].id)
        matches_x[i].end = Date.parse(tournamentById.get(matches_x[i].event_id).EndDateTime)
        all_matches.push(matches_x[i])
      }
      all_matches.sort(sortStartStage)
      setMatches(all_matches)
    })
  }, [playerid])

  const rating = player_ratings.get(playerid)

  return (
    <div className="player-card card">
      <div className="card-header">
        {`[${Math.floor(rating.rating)} ± ${Math.floor(rating.rd)}]`} {player.name}
        <a className="toggle-venue" onClick={() => setShowVenue(v => !v)}>{showVenue ? 'Show Ratings' : 'Show Venues'}</a>
        <div className="card-close" onClick={hidePlayer}>x</div>
      </div>
      <div className="card-content">
        <PlayerGraph playerid={playerid} matches={matches} />
        {matches.map(m => {
          const tourney = tournamentById.get(m.event_id)
          const scores = m.scores.split(',').map(x => x.split('-'))
          const change = Math.round(m.rc.new_r1 - m.rc.r1)

          if (m.a_id === playerid) {
            return <div key={m.id} className={`match-row ${change < 0 ? 'match-loss' : ''}`}>
              <div className="match-rating-change">{change}</div>
              <div className="match-res">{m.res_a} - {m.res_x}</div>
              {!showVenue && <div className="match-ratings">
                <span>{Math.floor(m.rc.r1)}</span>
                {' '}
                <span>{Math.floor(m.rc.r2)}</span>
              </div>}
              <div className="match-opponent" data-playerid={m.x_id} onClick={showPlayer}>{playerById.get(m.x_id).name}</div>
              <div className="match-date">{tourney.EndDate}</div>
              <div className="match-stage">
                {m.team ? 'T' : ''}{m.stage}
              </div>
              {showVenue && <div className="match-event" data-eventid={m.event_id} onClick={showTourney}>
                {tourney.ShortName}
              </div>}
              <div className="match-scores">
                {scores.map((set, i) =>
                  <div key={i} className="match-scores-set">
                    <div>{set[0]}</div>
                    <div>{set[1]}</div>
                  </div>
                )}
              </div>
            </div>
          } else {
            const change = Math.round(m.rc.new_r2 - m.rc.r2)
            return <div key={m.id} className={`match-row ${change < 0 ? 'match-loss' : ''}`}>
              <div className="match-rating-change">{change}</div>
              <div className="match-res">{m.res_x} - {m.res_a}</div>
              {!showVenue && <div className="match-ratings">
                <span>{Math.floor(m.rc.r2)}</span>
                {' '}
                <span>{Math.floor(m.rc.r1)}</span>
              </div>}
              <div className="match-opponent" data-playerid={m.a_id} onClick={showPlayer}>{playerById.get(m.a_id).name}</div>
              <div className="match-date">{tourney.EndDate}</div>
              <div className="match-stage">
                {m.team ? 'T' : ''}{m.stage}
              </div>
              {showVenue && <div className="match-event" data-eventid={m.event_id} onClick={showTourney}>
                {tourney.ShortName}
              </div>}
              <div className="match-scores">
                {scores.map((set, i) =>
                  <div key={i} className="match-scores-set">
                    <div>{set[1]}</div>
                    <div>{set[0]}</div>
                  </div>
                )}
              </div>
            </div>
          }
        })}
      </div>
    </div>
  )
}

export function EmptyCard({ hidePlayer }) {
  return (
    <div className="player-card card empty-card">
      <div className="card-header">
        <div className="card-close" onClick={hidePlayer}>x</div>
      </div>
      <div className="card-content">
      </div>
    </div>
  )
}

const SVG_START = 40
const SVG_TOP = 10
const SVG_BOT = 400
const THREE_YEARS = 3 * 365 * 86400000
const GRAPH_START = new Date().getTime() - THREE_YEARS
const THIRTYDAY = 30 * 86400000
const GRAPH_END = new Date(new Date().getTime() + THIRTYDAY);
const GRAPH_SCALE_X = [GRAPH_START, GRAPH_END]
const GRAPH_SCALE_Y = [1200, 2400]
const ISOMONTH = utcFormat("%Y-%m")

const y = scaleLog(GRAPH_SCALE_Y, [0, SVG_BOT])
const yticks = y.ticks(10)

export function PlayerGraph({ playerid, matches }) {
  const [width, setWidth] = useState(null)
  const div = useCallback(node => {
    if (node !== null) {
      setWidth(node.getBoundingClientRect().width);
    }
  }, [])

  const end = width
  const x = scaleTime(GRAPH_SCALE_X, [0, width])
  const xticks = x.ticks(utcMonth.every(6))

  const validMatches = useMemo(() => {
    let v = []
    let curr = null
    matches.forEach(m => {
      // if new tournament, add new entry
      if (curr == null || curr.end !== m.end) {
        if (playerid === m.a_id) {
          curr = { event_id: m.event_id, end: m.end, rating: m.rc.new_r1, rd: m.rc.new_rd1 }
        } else {
          curr = { event_id: m.event_id, end: m.end, rating: m.rc.new_r2, rd: m.rc.new_rd2 }
        }
        v.push(curr)
      } else {
        if (playerid === m.a_id) {
          if (curr.rd > m.rc.new_rd1) {
            curr.rd = m.rc.new_rd1
            curr.rating = m.rc.new_r1
          }
        } else {
          if (curr.rd > m.rc.new_rd2) {
            curr.rd = m.rc.new_rd2
            curr.rating = m.rc.new_r2
          }
        }
      }
    })

    return v
  }, [matches])

  const tooltip = useRef(null)
  const tooltxt = useRef(null)
  const [graphx, setGraphx] = useState(0)
  const graph = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      setGraphx(graph.current.getBoundingClientRect().x)
    }
    handleResize()
    window.addEventListener('resize', handleResize);

    // Cleanup the event listener on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, [graph]);

  const handleMouseOver = useCallback((evt) => {
    const t = tooltip.current
    const txt = tooltxt.current

    if (t != null) {
      if (evt.target.className.baseVal === 'graph-match') {
        t.classList.add('tooltip-shown')
        const data = evt.target.dataset
        t.style.transform = `translate(${evt.target.cx.baseVal.value - 50}px, ${evt.target.cy.baseVal.value}px)`
        t.innerText = `${tournamentById.get(+data.event).EndDate}
          Rank ${data.rank}
          ${data.rating} ± ${data.rd}
        `
      } else {
        t.classList.remove('tooltip-shown')
      }
    }

    if (txt != null && graphx != 0) {
      const date = x.invert(evt.clientX - graphx + 5) // 5 px buffer for circle size
      let l = 0, r = tournaments.length - 1
      while (l < r) {
        const p = Math.ceil((l + r) / 2)

        if (tournaments[p].End === date) {
          l = r = p
        } else if (tournaments[p].End < date) {
          l = p
        } else {
          r = p - 1
        }
      }

      txt.innerText = tournaments[l].ShortName
    }
  }, [graphx])

  return (
    <div className="graph-container" ref={div}>
      <div className="graph-tooltip" ref={tooltip}>
      </div>
      <div className="graph-tooltxt" ref={tooltxt}>
      </div>
      <svg className="player-graph" ref={graph} height={SVG_BOT}
        onMouseMove={handleMouseOver}
      >
        <g>
          {xticks.map(t => {
            const xx = x(t)
            return (
              <line key={t} className="xticks-line" x1={xx} x2={xx} y1={0} y2={SVG_BOT} stroke="#333" />
            )
          })}
        </g>
        <g>
          {xticks.map(t => {
            return (
              <text key={t} className="xticks" transform={`translate(${x(t) + 10}, ${SVG_BOT - 30}) rotate(-30)`}>{ISOMONTH(t)}</text>
            )
          })}
        </g>
        <g>
          {yticks.map(t => {
            const yy = SVG_BOT - y(t)
            return (
              <line key={t} className="yticks-line" x1={0} x2={width} y1={yy} y2={yy} stroke="#333" />
            )
          })}
        </g>
        <g>
          {yticks.map(t => {
            return (
              <text key={t} className="yticks" transform={`translate(0, ${SVG_BOT - y(t)})`}>{t}</text>
            )
          })}
        </g>

        <line className="y-axis" x1={SVG_START} y1={SVG_TOP} x2={SVG_START} y2={SVG_BOT - 10} stroke="#eee"></line>
        <line className="x-axis" x1={10} y1={SVG_BOT - 40} x2={end} y2={SVG_BOT - 40} stroke="#eee"></line>

        {tournaments.map((t, i) => {
          if (t.End < GRAPH_START + 2 * THIRTYDAY) return
          const rating = all_ratings[i].get(playerid)
          if (rating == null) return
          const rank = all_ranks_by_id[i].get(playerid) + 1
          const ranklog = Math.floor(Math.log2(rank))
          const opacity = Math.max((150 - rating.rd) / 100, 0.1)

          return <circle
            key={t.EventId}
            opacity={opacity}
            cx={x(t.End)} cy={SVG_BOT - y(rating.rating)} r={2}
            fill={RANKCOLORS[ranklog] || DEFAULT_RANK_COLOR}
          />
        })}

        {validMatches.map(m => {
          if (m.end < GRAPH_START + 2 * THIRTYDAY) return

          let opacity = 1
          if (m.rd > 120) return
          opacity = (150 - m.rd) / 100
          const t = tournamentById.get(m.event_id)
          let rank = all_ranks_by_id[t.Index].get(playerid) + 1
          const ranklog = Math.floor(Math.log2(rank))

          if (isNaN(rank)) {
            rank = '--'
          }

          return (
            <circle key={m.event_id}
              data-event={m.event_id}
              data-rank={rank}
              data-start={m.end}
              data-rating={Math.floor(m.rating)}
              data-rd={Math.floor(m.rd)}
              className="graph-match"
              opacity={opacity}
              cx={x(m.end)} cy={SVG_BOT - y(m.rating)} r={4}
              stroke={RANKCOLORS[ranklog] || DEFAULT_RANK_COLOR}
            />
          )
        })}
        <g className="graph-legend">
          {RANKCOLORS.map((color, i) => {
            return (
              <g key={color} transform={`translate(0, ${i * 20})`}>
                <circle fill={color} stroke={color} r={5}></circle>
                <text alignmentBaseline="middle" fill="#eee" x={10} fontSize="14px">Top {2 ** (i + 1) - 1}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

const DEFAULT_RANK_COLOR = 'rgb(183, 171, 255)'

const RANKCOLORS = ['crimson', 'coral', '#e9c46a', 'turquoise', 'skyblue']

export function DoublesPlayerCard({ playerid, showPlayer, hidePlayer, showTourney }) {
  const player = playerById.get(playerid)
  const [matches, setMatches] = useState([])
  const [showVenue, setShowVenue] = useState(true)

  useEffect(() => {
    init_doubles.then((db) => {
      return Promise.all([
        db.getAllFromIndex('doubles', 'a_id', playerid),
        db.getAllFromIndex('doubles', 'b_id', playerid),
        db.getAllFromIndex('doubles', 'x_id', playerid),
        db.getAllFromIndex('doubles', 'y_id', playerid),
      ])
    }).then(([matches_a, matches_b, matches_x, matches_y]) => {
      const all_matches = []
      const seen = new Set()

      const processMatches = (list) => {
        for (let i = list.length - 1; i >= 0; i--) {
          const m = list[i]
          if (seen.has(m.id)) continue
          seen.add(m.id)
          m.rc = doubles_rating_changes.get(m.id)
          m.end = Date.parse(tournamentById.get(m.event_id).EndDateTime)
          all_matches.push(m)
        }
      }

      processMatches(matches_a)
      processMatches(matches_b)
      processMatches(matches_x)
      processMatches(matches_y)

      all_matches.sort(sortStartStage)
      setMatches(all_matches)
    })
  }, [playerid])

  const rating = doubles_player_ratings.get(playerid) || { rating: 1500 }

  return (
    <div className="player-card card">
      <div className="card-header">
        {`[${Math.floor(rating.rating)}]`} {player.name}
        <a className="toggle-venue" onClick={() => setShowVenue(v => !v)}>{showVenue ? 'Show Ratings' : 'Show Venues'}</a>
        <div className="card-close" onClick={hidePlayer}>x</div>
      </div>
      <div className="card-content">
        <DoublesPlayerGraph playerid={playerid} matches={matches} />
        {matches.map(m => {
          const tourney = tournamentById.get(m.event_id)
          const scores = m.scores.split(',').map(x => x.split('-'))

          let my_r, partner_id, opp1_id, opp2_id
          if (m.a_id === playerid) {
            my_r = m.rc.r1_1
            partner_id = m.b_id
            opp1_id = m.x_id
            opp2_id = m.y_id
          } else if (m.b_id === playerid) {
            my_r = m.rc.r1_2
            partner_id = m.a_id
            opp1_id = m.x_id
            opp2_id = m.y_id
          } else if (m.x_id === playerid) {
            my_r = m.rc.r2_1
            partner_id = m.y_id
            opp1_id = m.a_id
            opp2_id = m.b_id
          } else {
            my_r = m.rc.r2_2
            partner_id = m.x_id
            opp1_id = m.a_id
            opp2_id = m.b_id
          }

          const isTeamA = m.a_id === playerid || m.b_id === playerid
          const scoreSelf = isTeamA ? m.res_a : m.res_x
          const scoreOpp = isTeamA ? m.res_x : m.res_a
          const change = isTeamA ? Math.round(m.rc.new_r1_1 - m.rc.r1_1) : Math.round(m.rc.new_r2_1 - m.rc.r2_1)

          return <div key={m.id} className={`match-row ${change < 0 ? 'match-loss' : ''}`}>
            <div className="match-rating-change">{change}</div>
            <div className="match-res">{scoreSelf} - {scoreOpp}</div>
            {!showVenue && <div className="match-ratings">
              <span>{Math.floor(my_r)}</span>
            </div>}
            <div className="match-opponent">
              <span className="player-link" data-playerid={opp1_id} onClick={showPlayer}>{playerById.get(opp1_id)?.name}</span>
              {" / "}
              <span className="player-link" data-playerid={opp2_id} onClick={showPlayer}>{playerById.get(opp2_id)?.name}</span>
              {partner_id > 0 && <span className="match-partner-span"> (w/ <span className="player-link" data-playerid={partner_id} onClick={showPlayer}>{playerById.get(partner_id)?.name}</span>)</span>}
            </div>
            <div className="match-date">{tourney.EndDate}</div>
            <div className="match-stage">
              {m.team ? 'T' : ''}{m.stage}
            </div>
            {showVenue && <div className="match-event" data-eventid={m.event_id} onClick={showTourney}>
              {tourney.ShortName}
            </div>}
            <div className="match-scores">
              {scores.map((set, i) => {
                const s1 = isTeamA ? set[0] : set[1]
                const s2 = isTeamA ? set[1] : set[0]
                return <div key={i} className="match-scores-set">
                  <div>{s1}</div>
                  <div>{s2}</div>
                </div>
              })}
            </div>
          </div>
        })}
      </div>
    </div>
  )
}

export function DoublesPlayerGraph({ playerid, matches }) {
  const [width, setWidth] = useState(null)
  const div = useCallback(node => {
    if (node !== null) {
      setWidth(node.getBoundingClientRect().width);
    }
  }, [])

  const end = width
  const x = scaleTime(GRAPH_SCALE_X, [0, width])
  const xticks = x.ticks(utcMonth.every(6))

  const validMatches = useMemo(() => {
    let v = []
    let curr = null
    matches.forEach(m => {
      let ratingVal
      if (playerid === m.a_id) ratingVal = m.rc.new_r1_1
      else if (playerid === m.b_id) ratingVal = m.rc.new_r1_2
      else if (playerid === m.x_id) ratingVal = m.rc.new_r2_1
      else ratingVal = m.rc.new_r2_2

      if (curr == null || curr.end !== m.end) {
        curr = { event_id: m.event_id, end: m.end, rating: ratingVal }
        v.push(curr)
      } else {
        curr.rating = ratingVal
      }
    })
    return v
  }, [matches, playerid])

  const tooltip = useRef(null)
  const tooltxt = useRef(null)
  const [graphx, setGraphx] = useState(0)
  const graph = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      setGraphx(graph.current.getBoundingClientRect().x)
    }
    handleResize()
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [graph]);

  const handleMouseOver = useCallback((evt) => {
    const t = tooltip.current
    const txt = tooltxt.current

    if (t != null) {
      if (evt.target.className.baseVal === 'graph-match') {
        t.classList.add('tooltip-shown')
        const data = evt.target.dataset
        t.style.transform = `translate(${evt.target.cx.baseVal.value - 50}px, ${evt.target.cy.baseVal.value}px)`
        t.innerText = `${tournamentById.get(+data.event).EndDate}
          Rank ${data.rank}
          ${data.rating}
        `
      } else {
        t.classList.remove('tooltip-shown')
      }
    }

    if (txt != null && graphx != 0) {
      const date = x.invert(evt.clientX - graphx + 5)
      let l = 0, r = tournaments.length - 1
      while (l < r) {
        const p = Math.ceil((l + r) / 2)
        if (tournaments[p].End === date) {
          l = r = p
        } else if (tournaments[p].End < date) {
          l = p
        } else {
          r = p - 1
        }
      }
      txt.innerText = tournaments[l].ShortName
    }
  }, [graphx, x])

  return (
    <div className="graph-container" ref={div}>
      <div className="graph-tooltip" ref={tooltip}>
      </div>
      <div className="graph-tooltxt" ref={tooltxt}>
      </div>
      <svg className="player-graph" ref={graph} height={SVG_BOT}
        onMouseMove={handleMouseOver}
      >
        <g>
          {xticks.map(t => {
            const xx = x(t)
            return <line key={t} className="xticks-line" x1={xx} x2={xx} y1={0} y2={SVG_BOT} stroke="#333" />
          })}
        </g>
        <g>
          {xticks.map(t => {
            return <text key={t} className="xticks" transform={`translate(${x(t) + 10}, ${SVG_BOT - 30}) rotate(-30)`}>{ISOMONTH(t)}</text>
          })}
        </g>
        <g>
          {yticks.map(t => {
            const yy = SVG_BOT - y(t)
            return <line key={t} className="yticks-line" x1={0} x2={width} y1={yy} y2={yy} stroke="#333" />
          })}
        </g>
        <g>
          {yticks.map(t => {
            return <text key={t} className="yticks" transform={`translate(0, ${SVG_BOT - y(t)})`}>{t}</text>
          })}
        </g>

        <line className="y-axis" x1={SVG_START} y1={SVG_TOP} x2={SVG_START} y2={SVG_BOT - 10} stroke="#eee"></line>
        <line className="x-axis" x1={10} y1={SVG_BOT - 40} x2={end} y2={SVG_BOT - 40} stroke="#eee"></line>

        {tournaments.map((t, i) => {
          if (t.End < GRAPH_START + 2 * THIRTYDAY) return
          const rating = doubles_all_ratings[i]?.get(playerid)
          if (rating == null) return
          const rankData = doubles_all_ranks_by_id[i]?.get(playerid)
          const rank = rankData ? rankData.X + 1 : 9999
          const ranklog = Math.floor(Math.log2(rank))

          return <circle
            key={t.EventId}
            opacity={1.0}
            cx={x(t.End)} cy={SVG_BOT - y(rating.rating)} r={2}
            fill={RANKCOLORS[ranklog] || DEFAULT_RANK_COLOR}
          />
        })}

        {validMatches.map(m => {
          if (m.end < GRAPH_START + 2 * THIRTYDAY) return
          const t = tournamentById.get(m.event_id)
          const rankData = doubles_all_ranks_by_id[t.Index]?.get(playerid)
          let rank = rankData ? rankData.X + 1 : NaN
          const ranklog = Math.floor(Math.log2(rank))

          if (isNaN(rank)) {
            rank = '--'
          }

          return (
            <circle key={m.event_id}
              data-event={m.event_id}
              data-rank={rank}
              data-start={m.end}
              data-rating={Math.floor(m.rating)}
              className="graph-match"
              opacity={1.0}
              cx={x(m.end)} cy={SVG_BOT - y(m.rating)} r={4}
              stroke={RANKCOLORS[ranklog] || DEFAULT_RANK_COLOR}
            />
          )
        })}
        <g className="graph-legend">
          {RANKCOLORS.map((color, i) => {
            return (
              <g key={color} transform={`translate(0, ${i * 20})`}>
                <circle fill={color} stroke={color} r={5}></circle>
                <text alignmentBaseline="middle" fill="#eee" x={10} fontSize="14px">Top {2 ** (i + 1) - 1}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}