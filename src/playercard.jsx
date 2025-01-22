import { isoFormat, line, path, scaleLinear, scaleLog, scalePow, scaleSqrt, scaleTime, utcFormat, utcMonth } from 'd3'
import './playercard.css'
import tournaments from './tournaments.json'
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { playerById, tournamentById } from "./idb"
import { all_ranks_by_id, all_ratings, init, player_ratings, rating_changes } from "./ratings"
import { STAGE_TO_NUM } from "./priority"
import { sortStartStage } from './event'

export function PlayerCard({ playerid, showPlayer, hidePlayer }) {
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
              {showVenue && <div className="match-event">{tourney.ShortName}</div>}
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
              {showVenue && <div className="match-event">{tourney.ShortName}</div>}
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
const GRAPH_START = Date.parse('01 Jul 2022 00:00:00 GMT')
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